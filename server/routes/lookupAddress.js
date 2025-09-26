import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  const { term, id } = req.query;
  const apiKey = process.env.GETADDRESS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing GETADDRESS_API_KEY" });

  let url;
  if (term) {
    url = `https://api.getAddress.io/autocomplete/${encodeURIComponent(term)}?api-key=${apiKey}`;
  } else if (id) {
    url = `https://api.getAddress.io/get/${encodeURIComponent(id)}?api-key=${apiKey}`;
  } else {
    return res.status(400).json({ error: "Must provide either ?term= or ?id=" });
  }

  try {
    const upstream = await fetch(url); // ✅ using Node v22 built-in fetch
    const payload = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: payload.error || "Upstream error" });
    }
    return res.status(200).json(payload);
  } catch (err) {
    console.error("🔴 Address lookup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
