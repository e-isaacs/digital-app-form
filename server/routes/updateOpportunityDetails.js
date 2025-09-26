// routes/updateOpportunityDetails.js
import express from "express";
import fetch from "node-fetch";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();

// Exit strategy values (if CRM uses option sets)
const exitStrategyReverse = {
  "Sale of security": 826430000,
  "Sale of another property": 826430001,
  "Refinance": 826430002,
  "Other": 826430003,
};

router.post("/update-opportunity-details/:id", async (req, res) => {
  const { id } = req.params; // Opportunity GUID
  const {
    loanAmount,
    loanTerm,
    fundsRequiredBy,
    sourceOfDeposit,
    loanPurposeDetail,
    exitStrategy,
  } = req.body;

  try {
    const token = await getDynamicsToken();
    const instanceUrl = process.env.DYNAMICS_INSTANCE_URL;

    // Build payload
    const payload = {
      inh_requestedloanamount: loanAmount
        ? Number(loanAmount.toString().replace(/[^0-9.]/g, ""))
        : null,
      inh_loanterm: loanTerm ? parseInt(loanTerm, 10) : null,
      inh_requestedcompletiondate: fundsRequiredBy || null,
      inh_sourceofdepositfunds: sourceOfDeposit || null,
      inh_capitalraiseloanpurpose: loanPurposeDetail || null,
      inh_exitstrategy: exitStrategy || null,
    };

    console.log("📥 Incoming opportunity details:", JSON.stringify(req.body, null, 2));
    console.log("📤 Opportunity details payload:", JSON.stringify(payload, null, 2));

    const oppUrl = `${instanceUrl}/api/data/v9.0/opportunities(${id})`;
    const crmRes = await fetch(oppUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "If-Match": "*",
      },
      body: JSON.stringify(payload),
    });

    if (!crmRes.ok) {
      const errText = await crmRes.text();
      throw new Error(`CRM update failed: ${errText}`);
    }

    console.log("🔎 Opportunity details PATCH response:", crmRes.status);
    res.json({ status: "ok", message: "Opportunity details updated", payload });
  } catch (err) {
    console.error("❌ Error updating opportunity details:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
