import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import fs from "fs";

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

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    const siteIdParts = process.env.SHAREPOINT_SITE_ID.split(",");
    const graphSiteId = siteIdParts[1];
    const driveId = process.env.SHAREPOINT_DRIVE_ID;
    const graphToken = await getGraphAccessToken();
    const fileName = "Temp_Form.docx";

    // 1️⃣ Upload DOCX to Graph
    const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/root:/${fileName}:/content`;
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

    // 2️⃣ Convert to PDF via Graph
    const itemId = uploaded.id;
    const pdfUrl = `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives/${driveId}/items/${itemId}/content?format=pdf`;

    console.log("🔄 Requesting PDF conversion from Graph...");
    const pdfRes = await fetch(pdfUrl, { headers: { Authorization: `Bearer ${graphToken}` } });
    if (!pdfRes.ok) throw new Error("Graph PDF conversion failed");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Application_Form.pdf");
    pdfRes.body.pipe(res);

    // Cleanup uploaded temp DOCX
    await fs.promises.unlink(req.file.path).catch(() => {});
  } catch (err) {
    console.error("❌ Error converting with Graph:", err);
    res.status(500).send("Conversion failed");
  }
});

export default router;
