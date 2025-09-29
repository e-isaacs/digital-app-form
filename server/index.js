import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import convertRoutes from "./routes/downloadAppFormPDF.js";
import applicationsRoutes from "./routes/applications.js";
import lookupAddressRoutes from "./routes/lookupAddress.js";

// New CRM routes
import crmRoutes from "./routes/crm.js";
import updateOpportunityContactsRoutes from "./routes/updateOpportunityContacts.js";
import updateOpportunitySecuritiesRoutes from "./routes/updateOpportunitySecurities.js";
import updateOpportunityCompanyRoutes from "./routes/updateOpportunityCompany.js";
import updateOpportunitySolicitorRoutes from "./routes/updateOpportunitySolicitor.js";
import updateOpportunityDetailsRoutes from "./routes/updateOpportunityDetails.js";
import saveAppFormPDFRoutes from "./routes/saveAppFormPDF.js";

// ✅ New Companies House routes
import companiesHouseRoutes from "./routes/companiesHouse.js";

dotenv.config();

const app = express();

// ✅ Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" })); // allow large base64 payloads
app.use(bodyParser.urlencoded({ extended: true, limit: "20mb" }));

// Health check
app.get("/", (req, res) => {
  res.send("Digital App Form API is running ✅");
});

// ✅ Mount routes
app.use("/api/download-pdf", convertRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/lookup-address", lookupAddressRoutes);

// Companies House
app.use("/api", companiesHouseRoutes);

// CRM-specific routes
app.use("/api/crm", crmRoutes);
app.use("/api/crm", updateOpportunityContactsRoutes);
app.use("/api/crm", updateOpportunitySecuritiesRoutes);
app.use("/api/crm", updateOpportunityCompanyRoutes);
app.use("/api/crm", updateOpportunitySolicitorRoutes);
app.use("/api/crm", updateOpportunityDetailsRoutes);
app.use("/api/save-pdf", saveAppFormPDFRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
