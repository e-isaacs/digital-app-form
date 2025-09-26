import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Microsoft Graph token
async function getGraphAccessToken() {
  const tenantId = process.env.SHAREPOINT_TENANT_ID;
  const clientId = process.env.SHAREPOINT_CLIENT_ID;
  const clientSecret = process.env.SHAREPOINT_CLIENT_SECRET;

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.access_token;
}

console.log("🔧 SharePoint environment configuration:");
console.log("   ➡️ TENANT_ID:", process.env.SHAREPOINT_TENANT_ID);
console.log("   ➡️ CLIENT_ID:", process.env.SHAREPOINT_CLIENT_ID);
console.log(
  "   ➡️ CLIENT_SECRET:",
  process.env.SHAREPOINT_CLIENT_SECRET
    ? process.env.SHAREPOINT_CLIENT_SECRET.substring(0, 4) + "****"
    : "❌ NOT SET"
);
console.log("   ➡️ SITE_ID:", process.env.SHAREPOINT_SITE_ID);
console.log("   ➡️ SITE_NAME:", process.env.SHAREPOINT_SITE_NAME);
console.log("   ➡️ DRIVE_ID (default):", process.env.SHAREPOINT_DRIVE_ID);
console.log("   ➡️ DRIVE_ID (opportunity):", process.env.SHAREPOINT_OPPORTUNITY_DRIVE_ID);

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
  const outputDir = path.join(process.cwd(), "converted");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  console.log(`📄 Uploaded file: ${inputPath}`);
  console.log(`📂 Output directory: ${outputDir}`);

  try {
    // 1️⃣ Convert DOCX → PDF
    console.log("🔄 Starting DOCX → PDF conversion...");
    await new Promise((resolve, reject) => {
      exec(
        `soffice --headless --nologo --nofirststartwizard --convert-to pdf:"writer_pdf_Export:EmbedStandardFonts=true" --outdir "${outputDir}" "${inputPath}"`,
        (err, stdout, stderr) => {
          console.log("📤 LibreOffice stdout:", stdout);
          console.log("⚠️ LibreOffice stderr:", stderr);
          if (err) {
            console.error("❌ LibreOffice error:", err);
            reject(err);
          } else {
            console.log("✅ LibreOffice finished without fatal error");
            resolve();
          }
        }
      );
    });

    console.log("📑 Checking for converted file...");
    const pdfPath = path.join(outputDir, path.parse(req.file.filename).name + ".pdf");
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`❌ Converted PDF not found at ${pdfPath}`);
    }
    console.log("📑 Found converted PDF at:", pdfPath);

    let pdfData;
    try {
      pdfData = fs.readFileSync(pdfPath);
      console.log("📏 PDF file size:", pdfData.length);
    } catch (readErr) {
      console.error("❌ Failed to read converted PDF:", readErr);
      throw readErr;
    }

    // 2️⃣ Fetch inh_folderlink from Dynamics
    console.log("🔎 Fetching inh_folderlink from Dynamics...");
    const token = await getDynamicsToken();
    const instanceUrl = process.env.DYNAMICS_INSTANCE_URL;
    const oppUrl = `${instanceUrl}/api/data/v9.0/opportunities(${opportunityId})?$select=inh_folderlink`;

    const oppRes = await fetch(oppUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!oppRes.ok) {
      const text = await oppRes.text();
      console.error("❌ Failed to fetch opportunity:", text);
      throw new Error(`Failed to fetch opportunity: ${text}`);
    }
    const oppJson = await oppRes.json();
    const folderLink = oppJson.inh_folderlink;
    console.log("📂 Dynamics inh_folderlink:", folderLink);

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
    driveFolderPath = driveFolderPath.replace(/^\/opportunity\//, "/");

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
    const graphToken = await getGraphAccessToken();
    const fileName = "Application_Form.pdf";

    let uploadUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/root:${encodedPath}/${fileName}:/content`;
    console.log("🌐 Graph API upload URL:", uploadUrl);

    let uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${graphToken}`, "Content-Type": "application/pdf" },
      body: pdfData,
    });

    // 5️⃣ Fallback if upload fails
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("❌ Upload to folder failed:", errText);
      console.log("⚠️ Retrying upload to root of drive...");

      uploadUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/root:/${fileName}:/content`;
      uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${graphToken}`, "Content-Type": "application/pdf" },
        body: pdfData,
      });

      if (!uploadRes.ok) {
        const fallbackErr = await uploadRes.text();
        console.error("❌ Fallback upload failed:", fallbackErr);
        throw new Error(`Upload failed: ${fallbackErr}`);
      }
    }

    const uploadJson = await uploadRes.json();
    console.log("✅ SharePoint upload successful:", JSON.stringify(uploadJson, null, 2));

    res.json({
      status: "ok",
      message: "Application PDF uploaded to SharePoint",
      sharepointResult: uploadJson,
    });

    // 6️⃣ Cleanup temp files
    console.log("🧹 Cleaning up temp files...");
    fs.unlinkSync(inputPath);
    fs.unlinkSync(pdfPath);
    console.log("✅ Cleanup complete");
  } catch (err) {
    console.error("❌ Error in saveAppFormPDF:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;