const { validateAndNormalize } = require("../rsvp-validate");
const { insertRsvpPg, getSql } = require("./rsvp-pg");
const { sendJson } = require("./send-json");

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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
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

  try {
    await insertRsvpPg(v.row);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: "Server error" });
  }
};
