const { validateAndNormalize } = require("../rsvp-validate");
const { insertRsvpPg, getSql } = require("./rsvp-pg");

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        if (!raw.trim()) {
          resolve({});
          return;
        }
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!getSql()) {
    res.status(503).json({
      error:
        "Database not configured. In Vercel: Storage → Neon → connect the database, add POSTGRES_URL (or DATABASE_URL), redeploy.",
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const v = validateAndNormalize(body);
  if (!v.ok) {
    res.status(400).json({ error: v.error });
    return;
  }

  try {
    await insertRsvpPg(v.row);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
