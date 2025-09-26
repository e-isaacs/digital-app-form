// routes/updateOpportunityCompany.js
import express from "express";
import fetch from "node-fetch";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();

router.post("/update-opportunity-company/:id", async (req, res) => {
  const { id } = req.params; // Opportunity GUID
  const { isCompany, companyName, companyNumber } = req.body;

  if (!isCompany) {
    return res.json({ status: "skipped", message: "Not a company application" });
  }

  try {
    const token = await getDynamicsToken();
    const instanceUrl = process.env.DYNAMICS_INSTANCE_URL;

    // --- 1. Try to find existing Account by companyNumber ---
    let accountId = null;
    if (companyNumber) {
      const findUrl = `${instanceUrl}/api/data/v9.0/accounts?$select=accountid&$filter=inh_registrationnumber eq '${companyNumber}'`;
      const findRes = await fetch(findUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (findRes.ok) {
        const json = await findRes.json();
        if (json.value?.length > 0) {
          accountId = json.value[0].accountid;
        }
      }
    }

    // --- 2. If not found, create a new Account ---
    if (!accountId) {
      const accountPayload = {
        name: companyName,
        inh_registrationnumber: companyNumber,
        customertypecode: 3, // Business
      };

      const createRes = await fetch(`${instanceUrl}/api/data/v9.0/accounts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(accountPayload),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        throw new Error(`Failed to create account: ${errText}`);
      }

      const entityUri = createRes.headers.get("OData-EntityId");
      accountId = entityUri.match(/\(([^)]+)\)/)[1];
    }

    // --- 3. Update Opportunity to link to Account + set company details ---
    const oppUrl = `${instanceUrl}/api/data/v9.0/opportunities(${id})`;
    const oppPayload = {
      "parentaccountid@odata.bind": `/accounts(${accountId})`,
      inh_companyname: companyName || "",
      inh_registrationnumber: companyNumber || ""
    };

    const oppRes = await fetch(oppUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "If-Match": "*",
      },
      body: JSON.stringify(oppPayload),
    });

    if (!oppRes.ok) {
      const errText = await oppRes.text();
      throw new Error(`Failed to update opportunity: ${errText}`);
    }

    res.json({
      status: "ok",
      message: "Opportunity linked to company account",
      accountId,
    });
  } catch (err) {
    console.error("❌ Error updating opportunity company:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
