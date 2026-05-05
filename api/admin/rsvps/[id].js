const { deleteRsvpPg, getSql } = require("../../rsvp-pg");
const { sendJson } = require("../../send-json");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204);
    return;
  }
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE, OPTIONS");
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
        "WEDDING_ADMIN_TOKEN is not set on Vercel. Project → Settings → Environment Variables → add WEDDING_ADMIN_TOKEN → Save → Redeploy.",
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

  const rawId = req.query && req.query.id;
  const id = typeof rawId === "string" ? Number(rawId, 10) : Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    sendJson(res, 400, { error: "Invalid id" });
    return;
  }

  try {
    const removed = await deleteRsvpPg(id);
    if (!removed) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Server error" });
  }
};
