const { listRsvpsPg, getSql } = require("../rsvp-pg");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
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

  const adminToken = process.env.WEDDING_ADMIN_TOKEN;
  if (!adminToken) {
    res.status(503).json({ error: "Admin token not configured on server" });
    return;
  }

  const auth = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  const got = match ? match[1].trim() : "";
  if (got !== adminToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const rows = await listRsvpsPg();
    res.status(200).json({ rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
