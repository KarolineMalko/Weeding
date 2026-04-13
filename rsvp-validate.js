/**
 * Server-side validation for simplified RSVP: name + guest count (yes) or name (no).
 * No invitation codes or per-guest name fields.
 */

const MAX_GUESTS = 99;

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

  return {
    ok: true,
    row: {
      attending: "yes",
      invite_code: null,
      decline_name: null,
      attendee_count: n,
      guest_names: JSON.stringify([name]),
      message: message || null,
    },
  };
}

module.exports = { validateAndNormalize, MAX_GUESTS };
