// routes/updateOpportunityContacts.js
import express from "express";
import fetch from "node-fetch";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";
import { countryOptions } from "../../client/src/utils/countries.js";
import { nationalityOptions } from "../../client/src/utils/nationalities.js";

const router = express.Router();

// --- Reverse mapping tables (labels → option set values) ---
const chargeTypeReverse = { "1st": 826430000, "2nd": 826430001 };
const loanPurposeReverse = {
  "Purchase": 826430000,
  "Capital Raise": 826430001,
  "Refinance": 826430002,
  "Cash-Out Refinance": 826430003,
  "Debt Consolidation": 826430004,
  "Refurbishment": 826430005,
  "Development": 826430006,
};
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
const tenureReverse = { "Freehold": 826430000, "Leasehold": 826430001 };
const residentialStatusReverse = {
  "Owner": 826430000,
  "Tenant": 826430001,
  "With relatives": 826430002,
  "Other": 826430003,
};
const maritalStatusReverse = {
  "Single": 1,
  "Married": 2,
  "Divorced": 3,
  "Widowed": 4,
  "Separated": 826430001,
  "Domestic partnership": 826430002,
  "Other": 826430003,
  "Prefer not to say": 826430004,
};

// --- Helper: find existing contact ---
async function findExistingContact(applicant, token, instanceUrl) {
  const { firstName, lastName, email, mobilePhone, address1Postcode } = applicant;

  const conditions = [];

  if (firstName && lastName && address1Postcode) {
    conditions.push(`(firstname eq '${firstName}' and lastname eq '${lastName}' and address1_postalcode eq '${address1Postcode}')`);
  }
  if (firstName && lastName && mobilePhone) {
    conditions.push(`(firstname eq '${firstName}' and lastname eq '${lastName}' and mobilephone eq '${mobilePhone}')`);
  }
  if (firstName && lastName && email) {
    conditions.push(`(firstname eq '${firstName}' and lastname eq '${lastName}' and emailaddress1 eq '${email}')`);
  }

  if (conditions.length === 0) {
    console.warn("⚠️ No valid filter conditions for applicant:", { firstName, lastName, email, mobilePhone, address1Postcode });
    return null;
  }

  const filter = conditions.join(" or ");
  const url = `${instanceUrl}/api/data/v9.0/contacts?$select=contactid&$filter=${encodeURIComponent(filter)}`;

  console.log("🔎 Searching for existing contact with filter:", filter);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.warn("⚠️ Contact search failed:", res.status);
    return null;
  }

  const json = await res.json();
  return json.value?.[0]?.contactid || null;
}

// --- Helper: resolve lookup values (for country + nationality) ---
async function resolveLookup(entitySet, fieldName, value, token, instanceUrl) {
  if (!value) return null;
  const url = `${instanceUrl}/api/data/v9.0/${entitySet}?$select=${entitySet.slice(
    0,
    -1
  )}id&$filter=${fieldName} eq '${value.replace("'", "''")}'`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.warn(`⚠️ Lookup failed for ${entitySet} with value: ${value}`);
    return null;
  }

  const json = await res.json();
  return json.value?.[0]?.[`${entitySet.slice(0, -1)}id`] || null;
}

// --- Helper: create or update contact ---
async function upsertContact(applicant, token, instanceUrl) {
  console.log("📥 Upserting contact for applicant:", {
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    email: applicant.email,
  });

  const existingId = await findExistingContact(applicant, token, instanceUrl);

const countryMatch = countryOptions.find(
  (c) => c.label.toLowerCase() === (applicant.countryOfBirth || "").toLowerCase()
);
const nationalityMatch = nationalityOptions.find(
  (n) => n.label.toLowerCase() === (applicant.nationality || "").toLowerCase()
);

const countryId = countryMatch ? countryMatch.value : null;
const nationalityId = nationalityMatch ? nationalityMatch.value : null;
  const payload = {
    firstname: applicant.firstName,
    lastname: applicant.lastName,
    salutation: applicant.salutation,
    emailaddress1: applicant.email,
    mobilephone: applicant.mobilePhone,
    telephone1: applicant.otherPhone,
    inh_dateofbirth: applicant.dob || null,
    familystatuscode: maritalStatusReverse[applicant.maritalStatus] || null,
    inh_permanentrighttoreside: applicant.permanentRightToReside,
    address1_line1: applicant.address1Line1,
    address1_line2: applicant.address1Line2,
    address1_line3: applicant.address1Line3,
    address1_city: applicant.address1Town,
    address1_postalcode: applicant.address1Postcode,
    address1_country: applicant.address1Country,
    inh_address1ataddresssince: applicant.address1AtSince || null,
    inh_address1residentialstatus:
      residentialStatusReverse[applicant.address1ResidentialStatus] || null,
  };

  // add lookup bindings if found
  if (countryId) {
    payload["inh_CountryOfBirth@odata.bind"] = `/inh_countries(${countryId})`;
  }
  if (nationalityId) {
    payload["inh_Nationality@odata.bind"] = `/inh_nationalities(${nationalityId})`;
  }

  console.log("📤 Contact payload:", JSON.stringify(payload, null, 2));

  if (existingId) {
    console.log(`📝 Updating existing contact ${existingId}`);
    const url = `${instanceUrl}/api/data/v9.0/contacts(${existingId})`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "If-Match": "*",
      },
      body: JSON.stringify(payload),
    });
    console.log("🔎 Contact PATCH response:", res.status);
    return existingId;
  } else {
    console.log("➕ Creating new contact");
    const url = `${instanceUrl}/api/data/v9.0/contacts`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    console.log("✅ New contact created with ID:", json.contactid);
    return json.contactid;
  }
}

// --- Main route ---
router.post("/update-opportunity-contacts/:id", async (req, res) => {
  const { id } = req.params;
  const applicants = req.body.applicants || [];

  try {
    const token = await getDynamicsToken();
    const instanceUrl = process.env.DYNAMICS_INSTANCE_URL;

    console.log("📥 Incoming applicants array:", JSON.stringify(applicants, null, 2));

    // Build contact GUIDs
    const contactIds = [];
    for (const [i, applicant] of applicants.slice(0, 5).entries()) {
      console.log(`🔄 Processing applicant ${i + 1}`);
      const guid = await upsertContact(applicant, token, instanceUrl);
      console.log(`✅ Contact GUID for applicant ${i + 1}:`, guid);
      if (guid) contactIds.push(guid);
    }

    // Build Opportunity PATCH payload
    const dynamicsPayload = {
      "parentcontactid@odata.bind": contactIds[0]
        ? `/contacts(${contactIds[0]})`
        : null,
      "inh_Applicant2Contact@odata.bind": contactIds[1]
        ? `/contacts(${contactIds[1]})`
        : null,
      "inh_Applicant3Contact@odata.bind": contactIds[2]
        ? `/contacts(${contactIds[2]})`
        : null,
      "inh_Applicant4Contact@odata.bind": contactIds[3]
        ? `/contacts(${contactIds[3]})`
        : null,
      "inh_Applicant5Contact@odata.bind": contactIds[4]
        ? `/contacts(${contactIds[4]})`
        : null,
      inh_numberofapplicants: applicants.length,
    };

    console.log("📤 Dynamics opportunity update payload:", JSON.stringify(dynamicsPayload, null, 2));

    const oppUrl = `${instanceUrl}/api/data/v9.0/opportunities(${id})`;
    const oppRes = await fetch(oppUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "If-Match": "*",
      },
      body: JSON.stringify(dynamicsPayload),
    });

    if (!oppRes.ok) {
      const errorText = await oppRes.text();
      console.error("❌ CRM PATCH failed:", errorText);
      return res.status(oppRes.status).json({ error: "CRM update failed", details: errorText });
    }

    console.log("✅ Opportunity contacts updated successfully for:", id);

    res.json({
      status: "ok",
      message: "Opportunity contacts updated",
      contactIds,
    });
  } catch (err) {
    console.error("❌ Error updating opportunity contacts:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
