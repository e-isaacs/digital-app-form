// routes/updateOpportunitySecurities.js
import express from "express";
import fetch from "node-fetch";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();

// --- Reverse mapping tables (labels → option set values) ---
const propertyTypeReverse = {
  "Semi-detached": 826430000,
  "Detached": 826430001,
  "Terraced": 826430002,
  "Bungalow": 826430003,
  "Flat": 826430004,
  "Maisonette": 826430005,
  "Studio flat": 826430006,
  "Commercial": 826430007,
  "Semi-commercial": 826430008,
  "Land": 826430009,
  "HMO": 826430010,
  "Other": 826430011,
};
const loanPurposeReverse = {
  "Purchase": 826430000,
  "Capital Raise": 826430001,
  "Refinance": 826430002,
  "Cash-Out Refinance": 826430003,
  "Debt Consolidation": 826430004,
  "Refurbishment": 826430005,
  "Development": 826430006,
};
const chargeTypeReverse = { "1st": 826430000, "2nd": 826430001 };
const tenureReverse = { "Freehold": 826430000, "Leasehold": 826430001 };

router.post("/update-opportunity-securities/:id", async (req, res) => {
  const { id } = req.params; // Opportunity GUID
  const securities = req.body.securities || [];

  try {
    const token = await getDynamicsToken();
    const instanceUrl = process.env.DYNAMICS_INSTANCE_URL;
    const secUrl = `${instanceUrl}/api/data/v9.0/inh_securities`;

    // --- 1. Clear existing links ---
    console.log("🔎 Checking for existing securities linked to opportunity:", id);

    const existingRes = await fetch(
      `${secUrl}?$filter=_inh_opportunity_value eq ${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const existingJson = await existingRes.json();

    console.log(`📦 Found ${existingJson.value?.length || 0} securities to clear`);

    for (const sec of existingJson.value || []) {
      const clearUrl = `${secUrl}(${sec.inh_securityid})`;

      console.log("🧹 Clearing link for security:", {
        securityId: sec.inh_securityid,
        clearUrl,
      });

      const clearRes = await fetch(clearUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "If-Match": "*",
        },
        body: JSON.stringify({ "inh_Opportunity@odata.bind": null }),
      });

      if (clearRes.ok) {
        console.log(`✅ Successfully cleared security ${sec.inh_securityid}`);
      } else {
        const errText = await clearRes.text();
        console.error(`❌ Failed to clear security ${sec.inh_securityid}:`, errText);
      }
    }

    // --- 2. Upsert securities ---
    const results = [];
    for (const sec of securities) {
      // Safe helper to avoid "undefined" option set values
      const safeOption = (value, map) =>
        value && map[value] !== undefined ? String(map[value]) : null;

      // Map fields (with safety + debug warnings)
      const payload = {
        inh_street1: sec.line1,
        inh_street2: sec.line2,
        inh_street3: sec.line3,
        inh_city: sec.town,
        inh_stateprovince: sec.county,
        inh_zippostalcode: sec.postcode,
        inh_countryregion: sec.country,

        inh_securitytype: safeOption(sec.propertyType, propertyTypeReverse),
        inh_loanpurpose: safeOption(sec.loanPurpose?.[0], loanPurposeReverse),
        inh_chargetype: safeOption(sec.chargeType, chargeTypeReverse),
        inh_tenuretype: safeOption(sec.tenure, tenureReverse),

        inh_securityvalue: sec.estimatedValue
          ? Number(sec.estimatedValue.toString().replace(/[^0-9.]/g, ""))
          : null,
        inh_purchaseprice: sec.purchasePrice
          ? Number(sec.purchasePrice.toString().replace(/[^0-9.]/g, ""))
          : null,
        inh_outstandingbalance: sec.outstandingBalance
          ? Number(sec.outstandingBalance.toString().replace(/[^0-9.]/g, ""))
          : null,
        inh_yearsleftonlease: sec.unexpiredTerm
          ? parseInt(sec.unexpiredTerm, 10)
          : null,

        "inh_Opportunity@odata.bind": `/opportunities(${id.toLowerCase()})`,
      };

      // 🔎 Extra debug logging for unmapped option sets
      if (payload.inh_securitytype === null && sec.propertyType) {
        console.warn("⚠️ Unmapped propertyType:", sec.propertyType);
      }
      if (payload.inh_loanpurpose === null && sec.loanPurpose?.[0]) {
        console.warn("⚠️ Unmapped loanPurpose:", sec.loanPurpose[0]);
      }
      if (payload.inh_chargetype === null && sec.chargeType) {
        console.warn("⚠️ Unmapped chargeType:", sec.chargeType);
      }
      if (payload.inh_tenuretype === null && sec.tenure) {
        console.warn("⚠️ Unmapped tenure:", sec.tenure);
      }

      console.log("📤 Security payload being processed:", JSON.stringify(payload, null, 2));

      // Try find existing match
      const filter = [
        sec.postcode ? `inh_zippostalcode eq '${sec.postcode}'` : null,
        sec.line1 ? `inh_street1 eq '${sec.line1}'` : null,
        sec.propertyType
          ? `inh_securitytype eq ${propertyTypeReverse[sec.propertyType]}`
          : null,
      ]
        .filter(Boolean)
        .join(" and ");

      let foundId = null;
      if (filter) {
        console.log("🔎 Searching for existing security with filter:", filter);
        const findUrl = `${secUrl}?$filter=${encodeURIComponent(filter)}`;
        const findRes = await fetch(findUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (findRes.ok) {
          const json = await findRes.json();
          if (json.value?.length > 0) {
            foundId = json.value[0].inh_securityid;
            console.log("✅ Match found, existing securityId:", foundId);
          } else {
            console.log("ℹ️ No existing security match found, will create new");
          }
        } else {
          const errText = await findRes.text();
          console.warn("⚠️ Search request failed:", errText);
        }
      }

      if (foundId) {
        console.log(`✏️ Updating existing security ${foundId}`);
        const updateRes = await fetch(`${secUrl}(${foundId})`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "If-Match": "*",
          },
          body: JSON.stringify(payload),
        });
        if (updateRes.ok) {
          console.log(`✅ Successfully updated security ${foundId}`);
          results.push({ updated: true, id: foundId });
        } else {
          const errText = await updateRes.text();
          console.error(`❌ Failed to update security ${foundId}:`, errText);
          throw new Error(`Security update failed: ${errText}`);
        }
      } else {
        console.log("➕ Creating new security record");
        const createRes = await fetch(secUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!createRes.ok) {
          const errText = await createRes.text();
          console.error("❌ Failed to create security:", errText);
          throw new Error(`Security create failed: ${errText}`);
        }
        const entityUri = createRes.headers.get("OData-EntityId");
        const newId = entityUri.match(/\(([^)]+)\)/)[1];
        console.log(`✅ Created new security ${newId}`);
        results.push({ created: true, id: newId });
      }
    }

    console.log("🎉 Securities update process complete:", results);
    res.json({ status: "ok", results });
  } catch (err) {
    console.error("❌ Error updating securities:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
