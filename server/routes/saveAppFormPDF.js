import express from "express";
import fetch from "node-fetch";
import multer from "multer";
import fs from "fs";
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

// 🔴 OLD: router.post("/:opportunityId")
// 🟢 NEW: keep endpoint the same as before → /crm/:opportunityId
router.post("/crm/:opportunityId", upload.single("file"), async (req, res) => {
  const { opportunityId } = req.params;
  console.log(`📥 Incoming request → saveAppFormPDF for opportunityId: ${opportunityId}`);

  if (!req.file) {
    console.warn("⚠️ No file uploaded in request");
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // 1️⃣ Validate opportunity exists in Dynamics
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
    console.log("📂 Dynamics inh_folderlink:", folderLink);
    if (!folderLink) throw new Error("No inh_folderlink set on opportunity");

    // 2️⃣ Upload DOCX to SharePoint via Graph
    const siteIdParts = process.env.SHAREPOINT_SITE_ID.split(",");
    const graphSiteId = siteIdParts[1];
    const driveId = process.env.SHAREPOINT_OPPORTUNITY_DRIVE_ID;
    const graphToken = await getGraphAccessToken();
    const fileName = "Application_Form.docx";

    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/root:/${fileName}:/content`;
    const fileBuffer = await fs.promises.readFile(req.file.path);

    console.log("📤 Uploading DOCX to Graph...");
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${graphToken}` },
      body: fileBuffer,
    });
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload failed: ${errText}`);
    }
    const uploaded = await uploadRes.json();
    console.log("✅ DOCX uploaded:", uploaded.id);

    // 3️⃣ Ask Graph to convert to PDF
    const itemId = uploaded.id;
    const pdfUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/items/${itemId}/content?format=pdf`;

    console.log("🔄 Requesting PDF conversion from Graph...");
    const pdfRes = await fetch(pdfUrl, { headers: { Authorization: `Bearer ${graphToken}` } });
    if (!pdfRes.ok) throw new Error("Graph PDF conversion failed");

    const pdfData = await pdfRes.arrayBuffer();
    console.log("✅ PDF generated, size:", pdfData.byteLength);

    res.json({
      status: "ok",
      message: "Application PDF generated + uploaded via Graph",
      size: pdfData.byteLength,
    });

    // Cleanup temp upload
    await fs.promises.unlink(req.file.path).catch(() => {});
  } catch (err) {
    console.error("❌ Error in saveAppFormPDF:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
