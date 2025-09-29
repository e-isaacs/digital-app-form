import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const inputPath = req.file.path;
  const outputDir = path.join(process.cwd(), "converted");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  exec(
    `soffice --headless --nologo --nofirststartwizard --convert-to pdf:"writer_pdf_Export:EmbedStandardFonts=true" --outdir "${outputDir}" "${inputPath}"`,
    (err, stdout, stderr) => {
      console.log("LibreOffice stdout:", stdout);
      console.error("LibreOffice stderr:", stderr);

      if (err) {
        console.error("Conversion error:", err);
        return res.status(500).send("Conversion failed");
      }

      const pdfPath = path.join(outputDir, path.parse(req.file.filename).name + ".pdf");

      res.download(pdfPath, "Application_Form.pdf", () => {
        try {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(pdfPath);
        } catch (cleanupErr) {
          console.warn("Cleanup error:", cleanupErr);
        }
      });
    }
  );
});

export default router;
