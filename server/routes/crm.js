// routes/crm.js
import express from "express";
import fetch from "node-fetch";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();

// ✅ Update opportunity
router.post("/update-opportunity/:id", async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  try {
    const token = await getDynamicsToken();
    const url = `${process.env.DYNAMICS_INSTANCE_URL}/api/data/v9.0/opportunities(${id})`;

    const crmRes = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "If-Match": "*",
      },
      body: JSON.stringify(payload),
    });

    if (!crmRes.ok) {
      const errorText = await crmRes.text();
      console.error("❌ CRM update failed:", errorText);
      return res
        .status(crmRes.status)
        .json({ error: "CRM update failed", details: errorText });
    }

    res.json({ status: "ok", message: "CRM updated successfully" });
  } catch (err) {
    console.error("❌ Error updating CRM:", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
});

// ✅ Add a task when application form is submitted
router.post("/opportunity/:id/add-task", async (req, res) => {
  const { id } = req.params; // opportunity GUID

  try {
    const token = await getDynamicsToken();

    // 1️⃣ Get the opportunity owner
    const oppUrl = `${process.env.DYNAMICS_INSTANCE_URL}/api/data/v9.0/opportunities(${id})?$select=_ownerid_value`;
    const oppRes = await fetch(oppUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const oppJson = await oppRes.json();
    if (!oppRes.ok) {
      console.error("❌ Failed to fetch opportunity:", oppJson);
      return res
        .status(oppRes.status)
        .json({ error: "Failed to fetch opportunity", details: oppJson });
    }

    const ownerId = oppJson._ownerid_value;
    if (!ownerId) {
      return res.status(400).json({ error: "No owner found on opportunity" });
    }

    // 2️⃣ Create a task linked to the opportunity and assign to owner
    const taskUrl = `${process.env.DYNAMICS_INSTANCE_URL}/api/data/v9.0/tasks`;
    const payload = {
      subject: "Application form completed and saved",
      description:
        "The customer has submitted the application form. A copy has been stored in SharePoint.",
      "regardingobjectid_opportunity@odata.bind": `/opportunities(${id})`,
      "ownerid@odata.bind": `/systemusers(${ownerId})`,
    };

    const taskRes = await fetch(taskUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!taskRes.ok) {
      const errText = await taskRes.text();
      console.error("❌ Task creation failed:", errText);
      return res
        .status(taskRes.status)
        .json({ error: "Task creation failed", details: errText });
    }

    res.json({ status: "ok", message: "Task created in CRM" });
  } catch (err) {
    console.error("❌ Error creating CRM task:", err);
    res
      .status(500)
      .json({ error: "Internal server error", details: err.message });
  }
});

export default router;
