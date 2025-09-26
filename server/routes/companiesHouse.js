// routes/companiesHouse.js
import express from "express";

const router = express.Router();

// 🔎 Company search
router.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "Missing ?q param" });

  try {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing COMPANIES_HOUSE_API_KEY" });
    }

    const upstream = await fetch(
      `https://api.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(q)}`,
      {
        headers: {
          Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64"),
        },
      }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Companies House search error:", err);
    res.status(500).json({ error: "Companies House lookup failed" });
  }
});

// 🔎 Company details
router.get("/company/:number", async (req, res) => {
  const { number } = req.params;
  try {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing COMPANIES_HOUSE_API_KEY" });
    }

    const upstream = await fetch(
      `https://api.company-information.service.gov.uk/company/${number}`,
      {
        headers: {
          Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64"),
        },
      }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("Company details error:", err);
    res.status(500).json({ error: "Company details lookup failed" });
  }
});

// 🔎 Persons with significant control
router.get("/company/:number/persons-with-significant-control", async (req, res) => {
  const { number } = req.params;
  try {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing COMPANIES_HOUSE_API_KEY" });
    }

    const upstream = await fetch(
      `https://api.company-information.service.gov.uk/company/${number}/persons-with-significant-control`,
      {
        headers: {
          Authorization: "Basic " + Buffer.from(apiKey + ":").toString("base64"),
        },
      }
    );
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error("PSC lookup error:", err);
    res.status(500).json({ error: "PSC lookup failed" });
  }
});

export default router;
