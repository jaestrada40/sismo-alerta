import Database from 'better-sqlite3';

export interface PushSubscriptionRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  min_magnitude: number;
  nearby_radius_km: number | null;
  user_lat: number | null;
  user_lng: number | null;
  created_at: number;
}

export interface CommunityReportRow {
  id: number;
  earthquakeId?: string;
  department: string;
  municipality: string;
  feltIntensity: string;
  buildingType: string;
  comments?: string;
  timestamp: number;
  mercalliEstimated: string;
}

export function initDb(path: string): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      min_magnitude REAL NOT NULL,
      nearby_radius_km REAL,
      user_lat REAL,
      user_lng REAL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS seen_earthquakes (
      usgs_id TEXT PRIMARY KEY,
      first_seen_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS community_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      earthquake_id TEXT,
      department TEXT NOT NULL,
      municipality TEXT NOT NULL,
      felt_intensity TEXT NOT NULL,
      building_type TEXT NOT NULL,
      comments TEXT,
      timestamp INTEGER NOT NULL,
      mercalli_estimated TEXT NOT NULL
    );
  `);

  return db;
}

export function insertSubscription(
  db: Database.Database,
  sub: Omit<PushSubscriptionRow, 'id' | 'created_at'>
): void {
  db.prepare(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth, min_magnitude, nearby_radius_km, user_lat, user_lng)
     VALUES (@endpoint, @p256dh, @auth, @min_magnitude, @nearby_radius_km, @user_lat, @user_lng)
     ON CONFLICT(endpoint) DO UPDATE SET
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       min_magnitude = excluded.min_magnitude,
       nearby_radius_km = excluded.nearby_radius_km,
       user_lat = excluded.user_lat,
       user_lng = excluded.user_lng`
  ).run(sub);
}

export function deleteSubscriptionByEndpoint(db: Database.Database, endpoint: string): void {
  db.prepare(`DELETE FROM push_subscriptions WHERE endpoint = ?`).run(endpoint);
}

export function getAllSubscriptions(db: Database.Database): PushSubscriptionRow[] {
  return db.prepare(`SELECT * FROM push_subscriptions`).all() as PushSubscriptionRow[];
}

export function hasSeenEarthquake(db: Database.Database, usgsId: string): boolean {
  const row = db.prepare(`SELECT 1 FROM seen_earthquakes WHERE usgs_id = ?`).get(usgsId);
  return row !== undefined;
}

export function markEarthquakeSeen(db: Database.Database, usgsId: string): void {
  db.prepare(`INSERT OR IGNORE INTO seen_earthquakes (usgs_id) VALUES (?)`).run(usgsId);
}

export function insertReport(
  db: Database.Database,
  report: Omit<CommunityReportRow, 'id'>
): CommunityReportRow {
  const result = db
    .prepare(
      `INSERT INTO community_reports (earthquake_id, department, municipality, felt_intensity, building_type, comments, timestamp, mercalli_estimated)
       VALUES (@earthquakeId, @department, @municipality, @feltIntensity, @buildingType, @comments, @timestamp, @mercalliEstimated)`
    )
    .run({
      earthquakeId: report.earthquakeId ?? null,
      department: report.department,
      municipality: report.municipality,
      feltIntensity: report.feltIntensity,
      buildingType: report.buildingType,
      comments: report.comments ?? null,
      timestamp: report.timestamp,
      mercalliEstimated: report.mercalliEstimated,
    });

  return { ...report, id: Number(result.lastInsertRowid) };
}

export function getAllReports(db: Database.Database): CommunityReportRow[] {
  const rows = db
    .prepare(`SELECT * FROM community_reports ORDER BY timestamp DESC`)
    .all() as any[];
  return rows.map((r) => ({
    id: r.id,
    earthquakeId: r.earthquake_id ?? undefined,
    department: r.department,
    municipality: r.municipality,
    feltIntensity: r.felt_intensity,
    buildingType: r.building_type,
    comments: r.comments ?? undefined,
    timestamp: r.timestamp,
    mercalliEstimated: r.mercalli_estimated,
  }));
}
