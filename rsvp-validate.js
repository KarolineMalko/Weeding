/**
 * Server-side validation for RSVP: guest list array (yes) or decline name (no).
 */

const MAX_GUESTS = 99;
const MAX_GUEST_NAME_PART_LEN = 120;

/**
 * @returns {{ ok: true, row: object } | { ok: false, error: string }}
 */
function validateAndNormalize(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON" };
  }

  const attending = body.attending === "no" ? "no" : body.attending === "yes" ? "yes" : null;
  if (!attending) {
    return { ok: false, error: "Missing or invalid attendance" };
  }

  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";

  if (attending === "no") {
    const declineName =
      typeof body.name === "string"
        ? body.name.trim()
        : typeof body.declineName === "string"
          ? body.declineName.trim()
          : "";
    if (!declineName) {
      return { ok: false, error: "Name is required" };
    }
    return {
      ok: true,
      row: {
        attending: "no",
        invite_code: null,
        decline_name: declineName,
        attendee_count: null,
        guest_names: null,
        message: message || null,
      },
    };
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const raw =
    body.guestCount !== undefined && body.guestCount !== null
      ? body.guestCount
      : body.guests;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > MAX_GUESTS) {
    return { ok: false, error: "Invalid number of guests" };
  }

  let guestNamesArr = normalizeGuestNameList(body.guestNameList, n);
  if (!guestNamesArr) {
    guestNamesArr = legacyGuestNamesFromBody(body, name, n);
  }
  if (!guestNamesArr) {
    return { ok: false, error: "Invalid or incomplete guest names" };
  }

  return {
    ok: true,
    row: {
      attending: "yes",
      invite_code: null,
      decline_name: null,
      attendee_count: n,
      guest_names: JSON.stringify(guestNamesArr),
      message: message || null,
    },
  };
}

function normalizeGuestNameList(list, n) {
  if (!Array.isArray(list) || list.length !== n) return null;
  const cleaned = list.map((x) =>
    typeof x === "string" ? x.trim().slice(0, MAX_GUEST_NAME_PART_LEN) : ""
  );
  if (cleaned.length !== n || cleaned.some((x) => !x)) return null;
  return cleaned;
}

/** Older clients: single textarea `guestNames` or n === 1 with contact only */
function legacyGuestNamesFromBody(body, name, n) {
  if (n === 1) {
    return [name];
  }
  const s =
    typeof body.guestNames === "string"
      ? body.guestNames
      : typeof body.guest_names_extra === "string"
        ? body.guest_names_extra
        : "";
  if (!s.trim()) return null;
  const parts = s
    .split(/[\n,;]+/)
    .map((p) => p.trim().slice(0, MAX_GUEST_NAME_PART_LEN))
    .filter(Boolean);
  const lower = new Set([name.toLowerCase()]);
  const out = [name];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (lower.has(k)) continue;
    lower.add(k);
    out.push(p);
  }
  return out.length === n ? out : null;
}

/** Optional invite code when inserting via admin (public RSVP keeps codes null). */
function applyAdminInviteOverlay(body, row) {
  if (!body || typeof body !== "object") return row;
  const raw = body.invite_code ?? body.inviteCode;
  if (typeof raw !== "string") return row;
  const t = raw.trim().slice(0, 64);
  return { ...row, invite_code: t || null };
}

module.exports = { validateAndNormalize, MAX_GUESTS, applyAdminInviteOverlay };
