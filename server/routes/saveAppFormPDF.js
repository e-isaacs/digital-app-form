// routes/saveAppFormPDF.js
import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Helper: encode SharePoint path correctly
function encodeDrivePath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

router.post("/:opportunityId", upload.single("file"), async (req, res) => {
  const { opportunityId } = req.params;
  console.log(`📥 Incoming request → saveAppFormPDF for opportunityId: ${opportunityId}`);

  if (!req.file) {
    console.warn("⚠️ No file uploaded in request");
    return res.status(400).json({ error: "No file uploaded" });
  }

  const inputPath = req.file.path;
  console.log(`📄 Uploaded DOCX: ${inputPath}`);

  try {
    // 1️⃣ Convert DOCX → PDF via Cloudmersive
    console.log("🔄 Sending DOCX to Cloudmersive for conversion...");
    const apiKey = process.env.CLOUDMERSIVE_API_KEY;
    if (!apiKey) throw new Error("Missing CLOUDMERSIVE_API_KEY in environment");

    const docxBuffer = fs.readFileSync(inputPath);
    const cloudmersiveRes = await axios.post(
      "https://api.cloudmersive.com/convert/docx/to/pdf",
      docxBuffer,
      {
        headers: {
          "Content-Type": "application/octet-stream",
          Apikey: apiKey,
        },
        responseType: "arraybuffer",
      }
    );

    const pdfData = cloudmersiveRes.data;
    console.log("✅ DOCX converted to PDF, size:", pdfData.length);

    // 2️⃣ Fetch inh_folderlink from Dynamics
    console.log("🔎 Fetching inh_folderlink from Dynamics...");
    const token = await getDynamicsToken();
    const instanceUrl = process.env.DYNAMICS_INSTANCE_URL;
    const oppUrl = `${instanceUrl}/api/data/v9.0/opportunities(${opportunityId})?$select=inh_folderlink`;

    const oppRes = await fetch(oppUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!oppRes.ok) {
      const text = await oppRes.text();
      throw new Error(`Failed to fetch opportunity: ${text}`);
    }
    const oppJson = await oppRes.json();
    const folderLink = oppJson.inh_folderlink;
    if (!folderLink) throw new Error("No inh_folderlink set on opportunity");

    // 3️⃣ Prepare SharePoint path
    const folderUrl = new URL(folderLink);
    let driveFolderPath = decodeURI(folderUrl.pathname).trim();
    console.log("📂 Raw folder path from link:", driveFolderPath);

    const siteRoot = "/sites/" + process.env.SHAREPOINT_SITE_NAME;
    if (driveFolderPath.startsWith(siteRoot)) {
      driveFolderPath = driveFolderPath.substring(siteRoot.length);
    }
    // Example now: /Shared Documents/opportunity/12345 Test

    // 🔹 Strip "Shared Documents/opportunity/" so only folder remains
    driveFolderPath = driveFolderPath.replace(/^\/Shared Documents\/opportunity\//, "/");

    // Ensure clean leading slash
    if (!driveFolderPath.startsWith("/")) {
      driveFolderPath = "/" + driveFolderPath;
    }

    // Final path should now look like: /12345 Test
    const encodedPath = encodeDrivePath(driveFolderPath);
    console.log("📂 Final folder path for Graph API:", driveFolderPath);
    console.log("📂 Encoded folder path for Graph API:", encodedPath);

    // 4️⃣ Upload to SharePoint via Graph
    const siteIdParts = process.env.SHAREPOINT_SITE_ID.split(",");
    const graphSiteId = siteIdParts[1];
    const driveId = process.env.SHAREPOINT_OPPORTUNITY_DRIVE_ID;

    // Graph token (reuse getGraphAccessToken from your utils if you have it)
    const graphTokenUrl = `https://login.microsoftonline.com/${process.env.SHAREPOINT_TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SHAREPOINT_CLIENT_ID,
      client_secret: process.env.SHAREPOINT_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
    });
    const tokenRes = await fetch(graphTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const tokenJson = await tokenRes.json();
    const graphToken = tokenJson.access_token;

    const fileName = "Application_Form.pdf";
    let uploadUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/root:${encodedPath}/${fileName}:/content`;
    console.log("🌐 Uploading PDF to Graph:", uploadUrl);

    let uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${graphToken}`, "Content-Type": "application/pdf" },
      body: pdfData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("❌ Upload to folder failed:", errText);
      return res.status(500).json({ error: "Upload failed", details: errText });
    }

    console.log("✅ PDF uploaded to SharePoint successfully");
    res.json({ status: "ok", message: "PDF saved to SharePoint" });
  } catch (err) {
    console.error("❌ Error in saveAppFormPDF:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    // Cleanup temp DOCX
    try {
      fs.unlinkSync(inputPath);
    } catch {}
  }
});

export default router;
