const { listRsvpsPg, getSql } = require("../rsvp-pg");
const { sendJson } = require("../send-json");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204);
    return;
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!getSql()) {
    sendJson(res, 503, {
      error:
        "Database not configured. In Vercel: connect Neon, ensure STORAGE_URL or POSTGRES_URL is set, redeploy.",
    });
    return;
  }

  const adminToken = process.env.WEDDING_ADMIN_TOKEN;
  if (!adminToken) {
    sendJson(res, 503, {
      error:
        "WEDDING_ADMIN_TOKEN is not set on Vercel. Project → Settings → Environment Variables → add WEDDING_ADMIN_TOKEN for Production (and Preview if you use it) → Save → Redeploy.",
    });
    return;
  }

  const auth = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  const got = match ? match[1].trim() : "";
  if (got !== adminToken) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  try {
    const rows = await listRsvpsPg();
    sendJson(res, 200, { rows });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Server error" });
  }
};
