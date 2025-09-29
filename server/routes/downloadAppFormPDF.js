// routes/downloadAppFormPDF.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import axios from "axios";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const inputPath = req.file.path;

  try {
    console.log("📄 Converting DOCX → PDF via Cloudmersive...");
    const apiKey = process.env.CLOUDMERSIVE_API_KEY;
    if (!apiKey) throw new Error("Missing CLOUDMERSIVE_API_KEY in environment");

    const docxBuffer = fs.readFileSync(inputPath);
    const response = await axios.post(
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

    const pdfData = response.data;
    console.log("✅ DOCX converted to PDF, size:", pdfData.length);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Application_Form.pdf");
    res.send(pdfData);
  } catch (err) {
    console.error("❌ Cloudmersive conversion failed:", err.message);
    res.status(500).send("Conversion failed");
  } finally {
    try {
      fs.unlinkSync(inputPath);
    } catch {}
  }
});

export default router;
