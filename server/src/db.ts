import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_URL ?? "./data/addresses.db";
const dir = path.dirname(dbPath);

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS addresses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    country_code TEXT NOT NULL,
    fields       TEXT NOT NULL,
    created_at   TEXT NOT NULL
  )
`);

export default db;
