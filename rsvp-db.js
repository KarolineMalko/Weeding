const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "rsvp.db");

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS rsvps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    attending TEXT NOT NULL CHECK (attending IN ('yes', 'no')),
    invite_code TEXT,
    decline_name TEXT,
    attendee_count INTEGER,
    guest_names TEXT,
    message TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_rsvps_created ON rsvps (created_at DESC);
`);

const insertStmt = db.prepare(`
  INSERT INTO rsvps (created_at, attending, invite_code, decline_name, attendee_count, guest_names, message)
  VALUES (@created_at, @attending, @invite_code, @decline_name, @attendee_count, @guest_names, @message)
`);

const listStmt = db.prepare(`
  SELECT id, created_at, attending, invite_code, decline_name, attendee_count, guest_names, message
  FROM rsvps
  ORDER BY datetime(created_at) DESC
`);

const deleteStmt = db.prepare(`DELETE FROM rsvps WHERE id = ?`);

const updateStmt = db.prepare(`
  UPDATE rsvps SET
    attending = @attending,
    invite_code = @invite_code,
    decline_name = @decline_name,
    attendee_count = @attendee_count,
    guest_names = @guest_names,
    message = @message
  WHERE id = @id
`);

function insertRsvp(row) {
  insertStmt.run({
    created_at: new Date().toISOString(),
    attending: row.attending,
    invite_code: row.invite_code ?? null,
    decline_name: row.decline_name ?? null,
    attendee_count: row.attendee_count ?? null,
    guest_names: row.guest_names ?? null,
    message: row.message ?? null,
  });
}

function listRsvps() {
  return listStmt.all();
}

function deleteRsvpById(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) return false;
  const info = deleteStmt.run(n);
  return info.changes > 0;
}

function updateRsvpById(id, row) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) return false;
  const info = updateStmt.run({
    id: n,
    attending: row.attending,
    invite_code: row.invite_code ?? null,
    decline_name: row.decline_name ?? null,
    attendee_count: row.attendee_count ?? null,
    guest_names: row.guest_names ?? null,
    message: row.message ?? null,
  });
  return info.changes > 0;
}

module.exports = { insertRsvp, listRsvps, deleteRsvpById, updateRsvpById };
