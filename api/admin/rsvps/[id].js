const { deleteRsvpPg, updateRsvpPg, getSql } = require("../../rsvp-pg");
const { validateAndNormalize, applyAdminInviteOverlay } = require("../../../rsvp-validate");
const { sendJson } = require("../../send-json");

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

function parseId(rawId) {
  const id = typeof rawId === "string" ? parseInt(rawId, 10) : Number(rawId);
  return Number.isInteger(id) && id >= 1 ? id : NaN;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204);
    return;
  }

  if (req.method !== "DELETE" && req.method !== "PATCH") {
    res.setHeader("Allow", "DELETE, PATCH, OPTIONS");
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
  const id = parseId(rawId);
  if (!Number.isFinite(id)) {
    sendJson(res, 400, { error: "Invalid id" });
    return;
  }

  if (req.method === "DELETE") {
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
    return;
  }

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
    const updated = await updateRsvpPg(id, row);
    if (!updated) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Server error" });
  }
};
