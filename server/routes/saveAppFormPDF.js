import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import fs from "fs";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

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

function encodeDrivePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

router.post("/:opportunityId", upload.single("file"), async (req, res) => {
  const { opportunityId } = req.params;
  console.log(`📥 Incoming request → saveAppFormPDF for opportunityId: ${opportunityId}`);

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Get inh_folderlink from Dynamics
    const token = await getDynamicsToken();
    const instanceUrl = process.env.DYNAMICS_INSTANCE_URL;
    const oppUrl = `${instanceUrl}/api/data/v9.0/opportunities(${opportunityId})?$select=inh_folderlink`;

    const oppRes = await fetch(oppUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!oppRes.ok) throw new Error(await oppRes.text());
    const oppJson = await oppRes.json();
    const folderLink = oppJson.inh_folderlink;
    if (!folderLink) throw new Error("No inh_folderlink set on opportunity");

    // Build folder path
    const folderUrl = new URL(folderLink);
    let driveFolderPath = decodeURI(folderUrl.pathname).trim();
    const siteRoot = "/sites/" + process.env.SHAREPOINT_SITE_NAME;
    if (driveFolderPath.startsWith(siteRoot)) {
      driveFolderPath = driveFolderPath.substring(siteRoot.length);
    }
    driveFolderPath = driveFolderPath.replace(/^\/opportunity\//, "/");
    if (!driveFolderPath.startsWith("/")) driveFolderPath = "/" + driveFolderPath;
    const encodedPath = encodeDrivePath(driveFolderPath);

    // Upload DOCX to Graph
    const siteIdParts = process.env.SHAREPOINT_SITE_ID.split(",");
    const graphSiteId = siteIdParts[1];
    const driveId = process.env.SHAREPOINT_OPPORTUNITY_DRIVE_ID;
    const graphToken = await getGraphAccessToken();
    const fileName = "Application_Form.docx";

    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/root:${encodedPath}/${fileName}:/content`;
    const fileBuffer = await fs.promises.readFile(req.file.path);

    console.log("📤 Uploading DOCX to Graph...");
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${graphToken}` },
      body: fileBuffer,
    });
    if (!uploadRes.ok) throw new Error(await uploadRes.text());
    const uploaded = await uploadRes.json();
    console.log("✅ DOCX uploaded:", uploaded.id);

    // Convert to PDF
    const itemId = uploaded.id;
    const pdfUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/items/${itemId}/content?format=pdf`;

    console.log("🔄 Requesting PDF conversion from Graph...");
    const pdfRes = await fetch(pdfUrl, { headers: { Authorization: `Bearer ${graphToken}` } });
    if (!pdfRes.ok) {
      const errText = await pdfRes.text();
      throw new Error(`Graph PDF conversion failed: ${errText}`);
    }

    const pdfData = await pdfRes.arrayBuffer();

    // Upload PDF back to SharePoint
    const pdfUploadUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/root:${encodedPath}/Application_Form.pdf:/content`;
    const pdfUploadRes = await fetch(pdfUploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${graphToken}`, "Content-Type": "application/pdf" },
      body: Buffer.from(pdfData),
    });
    if (!pdfUploadRes.ok) throw new Error(await pdfUploadRes.text());

    const pdfUploaded = await pdfUploadRes.json();
    console.log("✅ PDF uploaded:", pdfUploaded.id);

    res.json({ status: "ok", message: "Application PDF uploaded to SharePoint", pdfUploaded });
    await fs.promises.unlink(req.file.path).catch(() => {});
  } catch (err) {
    console.error("❌ Error in saveAppFormPDF:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
