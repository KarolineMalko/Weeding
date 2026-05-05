/**
 * Postgres via Neon serverless driver (used on Vercel). Env: POSTGRES_URL
 */

const { neon } = require("@neondatabase/serverless");

let sqlTag;
let tableReady = false;

function getDatabaseUrl() {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.STORAGE_URL ||
    ""
  );
}

function getSql() {
  const url = getDatabaseUrl();
  if (!url) return null;
  if (!sqlTag) {
    sqlTag = neon(url);
  }
  return sqlTag;
}

async function ensureTable(sql) {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS rsvps (
      id SERIAL PRIMARY KEY,
      created_at TEXT NOT NULL,
      attending TEXT NOT NULL,
      invite_code TEXT,
      decline_name TEXT,
      attendee_count INTEGER,
      guest_names TEXT,
      message TEXT
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_rsvps_created ON rsvps (created_at DESC)
  `;
  tableReady = true;
}

async function insertRsvpPg(row) {
  const sql = getSql();
  if (!sql) throw new Error("POSTGRES_URL missing");
  await ensureTable(sql);
  const created = new Date().toISOString();
  await sql`
    INSERT INTO rsvps (created_at, attending, invite_code, decline_name, attendee_count, guest_names, message)
    VALUES (
      ${created},
      ${row.attending},
      ${row.invite_code ?? null},
      ${row.decline_name ?? null},
      ${row.attendee_count ?? null},
      ${row.guest_names ?? null},
      ${row.message ?? null}
    )
  `;
}

async function listRsvpsPg() {
  const sql = getSql();
  if (!sql) throw new Error("POSTGRES_URL missing");
  await ensureTable(sql);
  const rows = await sql`
    SELECT id, created_at, attending, invite_code, decline_name, attendee_count, guest_names, message
    FROM rsvps
    ORDER BY created_at DESC
  `;
  return rows;
}

async function deleteRsvpPg(id) {
  const sql = getSql();
  if (!sql) throw new Error("POSTGRES_URL missing");
  await ensureTable(sql);
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) return false;
  const rows = await sql`
    DELETE FROM rsvps WHERE id = ${n} RETURNING id
  `;
  return rows.length > 0;
}

module.exports = { getSql, insertRsvpPg, listRsvpsPg, deleteRsvpPg };
