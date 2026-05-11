const { validateAndNormalize, applyAdminInviteOverlay } = require("../../rsvp-validate");
const { insertRsvpPg, getSql, listRsvpsPg } = require("../rsvp-pg");
const { sendJson } = require("../send-json");

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
    sendJson(res, 204);
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

  if (req.method === "GET") {
    try {
      const rows = await listRsvpsPg();
      sendJson(res, 200, { rows });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: "Server error" });
    }
    return;
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: "Invalid JSON" });
      return;
    }

    const v = validateAndNormalize(body);
    if (!v.ok) {
      sendJson(res, 400, { error: v.error });
      return;
    }

    const row = applyAdminInviteOverlay(body, v.row);

    try {
      await insertRsvpPg(row);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      sendJson(res, 500, { error: "Server error" });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  sendJson(res, 405, { error: "Method not allowed" });
};
