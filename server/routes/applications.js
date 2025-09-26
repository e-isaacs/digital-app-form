import express from "express";
import pool from "../db/db.js";
import { getDynamicsToken } from "../utils/dynamicsAuth.js";

const router = express.Router();
// Create from CRM
router.post("/crm/create-application", async (req, res) => {
  const payload = req.body;
  const { opportunityGuid } = payload;

  if (!opportunityGuid) {
    return res.status(400).json({ error: "opportunityGuid is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO applications (id, data, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE
         SET data = EXCLUDED.data,
             updated_at = NOW()
       RETURNING *`,
      [opportunityGuid, payload]
    );

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
