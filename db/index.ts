import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "mutiara-community.db");
type GlobalDatabase = typeof globalThis & { __mutiaraDb?: Database.Database };

function initialise(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('resident','team')), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notices (id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', title_en TEXT NOT NULL, title_zh TEXT, title_ms TEXT, body_en TEXT NOT NULL, body_zh TEXT, body_ms TEXT, location TEXT NOT NULL, start_at TEXT, end_at TEXT, diversion TEXT, latitude TEXT, longitude TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, access_hash TEXT NOT NULL, owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, contact_email TEXT, kind TEXT NOT NULL, location TEXT NOT NULL, description TEXT NOT NULL, photo_key TEXT, photo_type TEXT, status TEXT NOT NULL DEFAULT 'received', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS report_events (id TEXT PRIMARY KEY, report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE, status TEXT NOT NULL, note_en TEXT NOT NULL, note_zh TEXT, note_ms TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS subscriptions (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, categories TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS report_events_report_idx ON report_events(report_id);
  `);
  const noticeColumns = db.prepare("PRAGMA table_info(notices)").all() as Array<{ name: string }>;
  if (!noticeColumns.some((column) => column.name === "route_path")) db.exec("ALTER TABLE notices ADD COLUMN route_path TEXT");
  const count = db.prepare("SELECT COUNT(*) AS count FROM notices").get() as { count: number };
  if (count.count === 0) seedNotices(db);
}

function seedNotices(db: Database.Database) {
  const now = new Date().toISOString();
  const insert = db.prepare(`INSERT INTO notices (id,kind,status,title_en,title_zh,title_ms,body_en,body_zh,body_ms,location,start_at,end_at,diversion,created_at,updated_at) VALUES (@id,@kind,'published',@titleEn,@titleZh,@titleMs,@bodyEn,@bodyZh,@bodyMs,@location,@startAt,@endAt,@diversion,@createdAt,@updatedAt)`);
  const examples = [
    { kind:"closure", titleEn:"Temporary road closure and diversion", titleZh:"临时道路封闭与绕行安排", titleMs:"Penutupan jalan sementara dan lencongan", bodyEn:"A temporary closure is planned near the LRT work zone. Follow the marked diversion and allow extra travel time.", bodyZh:"轻快铁施工区附近将临时封路。请按照现场绕行标志行驶，并预留额外出行时间。", bodyMs:"Penutupan sementara dirancang berhampiran zon kerja LRT. Ikuti lencongan bertanda dan sediakan masa perjalanan tambahan.", location:"Mutiara Line work zone", startAt:"2026-10-20T01:00:00.000Z", endAt:"2026-10-20T10:00:00.000Z", diversion:"Follow temporary signs and directions from traffic personnel." },
    { kind:"schedule", titleEn:"Upcoming construction schedule", titleZh:"近期施工安排", titleMs:"Jadual pembinaan akan datang", bodyEn:"Foundation and utility works will continue during the published working hours. Nearby residents may notice intermittent noise.", bodyZh:"地基及公用设施工程将在公布的施工时段内继续进行，附近居民可能会听到间歇性噪音。", bodyMs:"Kerja asas dan utiliti akan diteruskan dalam waktu kerja yang diterbitkan. Penduduk berdekatan mungkin mendengar bunyi berkala.", location:"George Town construction corridor", startAt:"2026-10-21T00:00:00.000Z", endAt:"2026-10-25T10:00:00.000Z", diversion:null },
    { kind:"transport", titleEn:"Temporary bus stop relocation", titleZh:"巴士站临时迁移", titleMs:"Pemindahan sementara perhentian bas", bodyEn:"The bus stop has moved temporarily. Use the signed pedestrian route to reach the replacement stop.", bodyZh:"巴士站已临时迁移，请按照行人指示路线前往临时站点。", bodyMs:"Perhentian bas telah dipindahkan sementara. Gunakan laluan pejalan kaki bertanda ke perhentian gantian.", location:"Near the construction entrance", startAt:"2026-10-18T00:00:00.000Z", endAt:null, diversion:"Use the signed walking route to the temporary stop." },
  ];
  db.transaction(() => examples.forEach((item) => insert.run({ ...item, id: crypto.randomUUID(), createdAt: now, updatedAt: now })))();
}

export function getDb() {
  const shared = globalThis as GlobalDatabase;
  if (!shared.__mutiaraDb) {
    fs.mkdirSync(dataDirectory, { recursive: true });
    shared.__mutiaraDb = new Database(databasePath);
    initialise(shared.__mutiaraDb);
  }
  return shared.__mutiaraDb;
}
export const localDataDirectory = dataDirectory;
