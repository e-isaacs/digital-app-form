import express from "express";
import pool from "../db/db.js";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();

// Create from CRM (button push)
router.post("/crm/create-application", async (req, res) => {
  const {
    opportunityGuid,
    isCompany,
    companyData,
    applicants = [],
    securities = [],
    loanAmount,
    loanTerm,
    fundsRequiredBy,
    exitStrategy,
    exitOtherExplain,
    loanPurposeDetail,
    sourceOfDeposit
  } = req.body;

  console.log("📥 Incoming CRM payload:", JSON.stringify(req.body, null, 2));

  if (!opportunityGuid) {
    console.warn("⚠️ Missing opportunityGuid in payload");
    return res.status(400).json({ error: "opportunityGuid is required" });
  }

  // Normalise payload so frontend sees same structure as ApplicationForm
  const appData = {
    isCompany: !!isCompany,
    companyData: companyData || null,

    applicants: applicants.map(a => ({
      salutation: a.salutation || "",
      firstName: a.firstName || "",
      lastName: a.lastName || "",
      dob: a.dob || "",
      email: a.email || "",
      mobilePhone: a.mobilePhone || "",
      otherPhone: a.otherPhone || "",
      maritalStatus: a.maritalStatus || "",
      countryOfBirth: a.countryOfBirth || "",
      nationality: a.nationality || "",
      permanentRightToReside: a.permanentRightToReside ?? null,
      creditHistory: a.creditHistory || {},

      // Address 1
      address1Line1: a.address1Line1 || "",
      address1Line2: a.address1Line2 || "",
      address1Line3: a.address1Line3 || "",
      address1Town: a.address1Town || "",
      address1Postcode: a.address1Postcode || "",
      address1Country: a.address1Country || "",
      address1AtSince: a.address1AtSince || "",
      address1ResidentialStatus: a.address1ResidentialStatus || "",

      // Address 2
      address2Line1: a.address2Line1 || "",
      address2Line2: a.address2Line2 || "",
      address2Line3: a.address2Line3 || "",
      address2Town: a.address2Town || "",
      address2Postcode: a.address2Postcode || "",
      address2Country: a.address2Country || "",
      address2AtSince: a.address2AtSince || "",
      address2ResidentialStatus: a.address2ResidentialStatus || "",

      // Address 3
      address3Line1: a.address3Line1 || "",
      address3Line2: a.address3Line2 || "",
      address3Line3: a.address3Line3 || "",
      address3Town: a.address3Town || "",
      address3Postcode: a.address3Postcode || "",
      address3Country: a.address3Country || "",
      address3AtSince: a.address3AtSince || "",
      address3ResidentialStatus: a.address3ResidentialStatus || ""
    })),

    securities: securities.map((s, index) => ({
      line1: s.line1 || "",
      line2: s.line2 || "",
      line3: s.line3 || "",
      town: s.town || "",
      county: s.county || "",
      postcode: s.postcode || "",
      country: s.country || "",
      propertyType: s.propertyType || "",
      loanPurpose: s.loanPurpose || [],
      estimatedValue: s.estimatedValue || "",
      purchasePrice: s.purchasePrice || "",
      outstandingBalance: s.outstandingBalance || "",
      firstChargeLender: s.firstChargeLender || "",
      chargeType: s.chargeType || "",
      tenure: s.tenure || "",
      unexpiredTerm: s.unexpiredTerm || "",
      isPrimary: s.isPrimary ?? (index === 0) // fallback if missing
    })),

    // Loan details from Opportunity (now preserved)
    loanAmount: loanAmount || "",
    loanTerm: loanTerm || "",
    fundsRequiredBy: fundsRequiredBy || "",
    exitStrategy: exitStrategy || "",
    exitOtherExplain: exitOtherExplain || "",
    loanPurposeDetail: loanPurposeDetail || "",
    sourceOfDeposit: sourceOfDeposit || ""
  };

  console.log("✅ Normalised application data:", JSON.stringify(appData, null, 2));

  try {
    const result = await pool.query(
      `INSERT INTO applications (id, data, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data,
             updated_at = NOW()
       RETURNING *`,
      [opportunityGuid, appData]
    );

    console.log(`💾 Application stored in DB with ID: ${opportunityGuid}`);

    const formLink = `${process.env.CLIENT_URL}/form/${opportunityGuid}`;
    res.json({ status: "ok", link: formLink, application: result.rows[0] });
  } catch (err) {
    console.error("❌ Error creating application:", err);
    res.status(500).json({ error: "Failed to create application" });
  }
});

// Fetch application
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM applications WHERE id = $1::uuid", [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });

    const app = result.rows[0];
    // Unwrap data so frontend sees fields directly
    res.json({ id: app.id, created_at: app.created_at, updated_at: app.updated_at, ...app.data });
  } catch (err) {
    console.error("❌ Fetch error:", err);
    res.status(500).json({ error: "DB fetch failed" });
  }
});

// Submit application → DB + CRM
router.post("/:id/submit", async (req, res) => {
  const { id } = req.params;
  const completedData = req.body;

  try {
    const result = await pool.query(
      `UPDATE applications SET data = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, completedData]
    );

    try {
      const token = await getDynamicsToken();
      const crmUrl = `${process.env.DYNAMICS_INSTANCE_URL}/api/data/v9.0/opportunities(${id})`;

      await fetch(crmUrl, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "If-Match": "*",
        },
        body: JSON.stringify(completedData),
      });
    } catch (crmErr) {
      console.warn("⚠️ CRM sync failed:", crmErr.message);
    }

    res.json({ status: "submitted", application: result.rows[0] });
  } catch (err) {
    console.error("❌ Submit error:", err);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

export default router;
