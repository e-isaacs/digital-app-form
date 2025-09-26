const pool = require("../db/db");

// Create application helper (if needed outside router)
async function createApplication(opportunityGuid, payload) {
  const result = await pool.query(
    `INSERT INTO applications (id, data, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE
       SET data = EXCLUDED.data,
           updated_at = NOW()
     RETURNING *`,
    [opportunityGuid, payload]
  );
  return result.rows[0];
}

module.exports = { createApplication };
