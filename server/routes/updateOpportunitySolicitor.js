// routes/updateOpportunitySolicitor.js
import express from "express";
import fetch from "node-fetch";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();

// Split "First Last" into { firstName, lastName }
function splitName(full) {
  if (!full) return { firstName: "", lastName: "" };
  const parts = full.trim().split(" ");
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || "",
  };
}

router.post("/update-opportunity-solicitor/:id", async (req, res) => {
  const { id } = req.params; // Opportunity GUID
  const {
    sraNumber,
    solicitorName,
    solicitorAddress = {},
    solicitorActing,
    solicitorContactNumber,
    solicitorContactEmail,
  } = req.body;

  if (!sraNumber) {
    return res.status(400).json({ error: "Missing SRA Number" });
  }

  try {
    const token = await getDynamicsToken();
    const instanceUrl = process.env.DYNAMICS_INSTANCE_URL;

    console.log("📥 Incoming solicitor data:", JSON.stringify(req.body, null, 2));

    // -------------------------
    // 1. Firm Account (inh_ClientSolicitorFirm)
    // -------------------------
    let firmId = null;
    const findFirmUrl = `${instanceUrl}/api/data/v9.0/accounts?$select=accountid&$filter=inh_sranumber eq '${sraNumber}'`;
    const firmRes = await fetch(findFirmUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (firmRes.ok) {
      const json = await firmRes.json();
      if (json.value?.length > 0) {
        firmId = json.value[0].accountid;
      }
    }

    if (!firmId) {
      // Create new solicitor firm account
      const firmPayload = {
        name: solicitorName,
        inh_sranumber: sraNumber,
        customertypecode: 12, // Solicitor firm
        address1_line1: solicitorAddress.line1 || "",
        address1_line2: solicitorAddress.line2 || "",
        address1_city: solicitorAddress.town || "",
        address1_stateorprovince: solicitorAddress.county || "",
        address1_postalcode: solicitorAddress.postcode || "",
        address1_country: solicitorAddress.country || "",
      };

      console.log("📤 Creating solicitor firm:", JSON.stringify(firmPayload, null, 2));

      const createFirmRes = await fetch(`${instanceUrl}/api/data/v9.0/accounts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(firmPayload),
      });

      if (!createFirmRes.ok) {
        const errText = await createFirmRes.text();
        throw new Error(`Failed to create solicitor firm: ${errText}`);
      }

      const entityUri = createFirmRes.headers.get("OData-EntityId");
      firmId = entityUri.match(/\(([^)]+)\)/)[1];
    }

    // Update Opportunity with firm
    const oppUrl = `${instanceUrl}/api/data/v9.0/opportunities(${id})`;
    const firmPatchPayload = {
      "inh_ClientSolicitorFirm@odata.bind": `/accounts(${firmId})`,
    };

    console.log("📤 Linking solicitor firm to opportunity:", JSON.stringify(firmPatchPayload, null, 2));

    const firmPatchRes = await fetch(oppUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "If-Match": "*",
      },
      body: JSON.stringify(firmPatchPayload),
    });
    console.log("🔎 Firm PATCH response:", firmPatchRes.status);

    // -------------------------
    // 2. Acting Solicitor Contact (inh_ClientSolicitorActing)
    // -------------------------
    let contactId = null;
    if (solicitorContactEmail) {
      const findContactUrl = `${instanceUrl}/api/data/v9.0/contacts?$select=contactid&$filter=customertypecode eq 12 and emailaddress1 eq '${solicitorContactEmail}'`;
      const contactRes = await fetch(findContactUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (contactRes.ok) {
        const json = await contactRes.json();
        if (json.value?.length > 0) {
          contactId = json.value[0].contactid;
        }
      }
    }

    if (!contactId) {
      const { firstName, lastName } = splitName(solicitorActing);
      const contactPayload = {
        firstname: firstName,
        lastname: lastName,
        emailaddress1: solicitorContactEmail,
        telephone1: solicitorContactNumber,
        customertypecode: 12, // Solicitor contact
        "parentcustomerid_account@odata.bind": `/accounts(${firmId})`,
      };

      console.log("📤 Creating solicitor contact:", JSON.stringify(contactPayload, null, 2));

      const createContactRes = await fetch(`${instanceUrl}/api/data/v9.0/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });

      if (!createContactRes.ok) {
        const errText = await createContactRes.text();
        throw new Error(`Failed to create solicitor contact: ${errText}`);
      }

      const entityUri = createContactRes.headers.get("OData-EntityId");
      contactId = entityUri.match(/\(([^)]+)\)/)[1];
    }

    const contactPatchPayload = {
      "inh_ClientSolicitorActing@odata.bind": `/contacts(${contactId})`,
    };

    console.log("📤 Linking acting solicitor to opportunity:", JSON.stringify(contactPatchPayload, null, 2));

    const contactPatchRes = await fetch(oppUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "If-Match": "*",
      },
      body: JSON.stringify(contactPatchPayload),
    });
    console.log("🔎 Contact PATCH response:", contactPatchRes.status);

    res.json({
      status: "ok",
      message: "Solicitor firm and acting solicitor linked to opportunity",
      firmId,
      contactId,
    });
  } catch (err) {
    console.error("❌ Error updating solicitor:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
