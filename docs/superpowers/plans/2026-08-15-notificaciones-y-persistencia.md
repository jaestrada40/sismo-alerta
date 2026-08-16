# Notificaciones Push, Persistencia y UX de Crisis — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side USGS polling with Web Push notifications, SQLite-backed persistence for push subscriptions and community reports, a crisis-mode UX pass on the alert banner, and PWA offline support for static content.

**Architecture:** Express (`server.ts`) gains a SQLite database (`better-sqlite3`), a watcher loop that polls USGS every 30s and sends Web Push via VAPID to qualifying subscribers, and REST endpoints for subscriptions/reports. The frontend gains a service worker for receiving push + offline caching, a notification settings UI, and reports move from local `useState` to backend-fetched data.

**Tech Stack:** Express, better-sqlite3, web-push (VAPID), Vite, React 19, TypeScript, Vitest (new — no test runner exists yet).

## Global Constraints

- Target: prototype/demo stage, no real users yet — prioritize simplicity (embedded SQLite, no external services) per the spec's explicit non-goal of production scaling.
- Push notifications trigger on: user-configured magnitude threshold, OR magnitude below threshold if within the user's configured "nearby" radius (spec Fase 1).
- Earthquake Early Warning (pre-shaking sensor detection) is explicitly out of scope.
- All user-facing strings are in Spanish (Guatemalan), matching existing app conventions.
- Reuse existing utilities instead of duplicating: `calculateDistanceKm` from `src/utils/seismicCalculations.ts`, and the USGS fetch/parse shape from `src/services/usgsService.ts`.

---

## File Structure

- `server/db.ts` — SQLite connection + schema init + typed repository functions (create/read/delete for subscriptions, seen earthquakes, reports).
- `server/seismicWatcher.ts` — pure function `selectNotifications(newQuakes, subscriptions)` (easily unit-testable, no I/O) + `pollAndNotify()` orchestration (I/O: fetch USGS, call db, call push).
- `server/pushService.ts` — thin wrapper around `web-push` (`sendNotification`, VAPID setup).
- `server/usgsServerFetch.ts` — server-side fetch of USGS geojson, returning the same shape as `parsedEarthquakes` in `src/services/usgsService.ts` (extracted/shared logic, no DOM/browser assumptions).
- `server.ts` — modified: mounts new REST endpoints, starts the watcher interval on boot.
- `public/sw.js` — new service worker: push receipt + notification display + (Phase 3) cache-first offline strategy.
- `public/manifest.json` — new PWA manifest.
- `src/services/reportsService.ts` — new: `fetchReports()`, `submitReport()` against backend REST endpoints.
- `src/services/pushSubscriptionService.ts` — new: browser-side registration of SW + push subscription + calls to `/api/push/subscribe`.
- `src/components/NotificationSettings.tsx` — new: permission request + magnitude/radius controls.
- `src/components/CommunityReports.tsx` — modified: fetches/submits via `reportsService` instead of receiving props from local state.
- `src/components/AlertBanner.tsx` — modified: action directive always visible (not `hidden sm:block`), no other structural change needed (magnitude/distance already lead the layout).
- `src/App.tsx` — modified: wires `reportsService`, reads `?eq=<id>` query param on mount to trigger the banner for a specific earthquake (notification click-through).
- `vitest.config.ts` — new: test runner config.
- `server/__tests__/seismicWatcher.test.ts`, `server/__tests__/db.test.ts` — new test files.

---

## Fase 1 — Fundación: datos persistentes + notificaciones push

### Task 1: Test runner setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add `"test": "vitest run"` script and `vitest` devDependency)

**Interfaces:**
- Produces: `npm test` / `npx vitest run` runs all `*.test.ts` files.

- [ ] **Step 1: Install vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Create vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, under `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 4: Verify it runs with zero tests**

Run: `npx vitest run`
Expected: "No test files found" (exits non-zero) — this is expected since no tests exist yet; confirms the binary works. Do not treat this as a failure.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test runner"
```

---

### Task 2: SQLite database module

**Files:**
- Create: `server/db.ts`
- Test: `server/__tests__/db.test.ts`
- Modify: `package.json` (add `better-sqlite3`, `@types/better-sqlite3` dependencies)
- Modify: `.gitignore` (add `data.db`, `data.db-journal`)

**Interfaces:**
- Produces:
  - `initDb(path: string): Database.Database` — opens/creates the DB file and runs schema migrations (idempotent, safe to call every boot).
  - `PushSubscriptionRow { id: number; endpoint: string; p256dh: string; auth: string; min_magnitude: number; nearby_radius_km: number | null; user_lat: number | null; user_lng: number | null; created_at: number }`
  - `insertSubscription(db, sub: Omit<PushSubscriptionRow, 'id' | 'created_at'>): void` — upsert by `endpoint`.
  - `deleteSubscriptionByEndpoint(db, endpoint: string): void`
  - `getAllSubscriptions(db): PushSubscriptionRow[]`
  - `hasSeenEarthquake(db, usgsId: string): boolean`
  - `markEarthquakeSeen(db, usgsId: string): void`
  - `CommunityReportRow` — same shape as `CommunityReport` from `src/types.ts` plus autogenerated `id`.
  - `insertReport(db, report: Omit<CommunityReportRow, 'id'>): CommunityReportRow`
  - `getAllReports(db): CommunityReportRow[]` — ordered by `timestamp DESC`.

- [ ] **Step 1: Install better-sqlite3**

Run: `npm install better-sqlite3 && npm install -D @types/better-sqlite3`

- [ ] **Step 2: Write the failing test**

```typescript
// server/__tests__/db.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  initDb,
  insertSubscription,
  deleteSubscriptionByEndpoint,
  getAllSubscriptions,
  hasSeenEarthquake,
  markEarthquakeSeen,
  insertReport,
  getAllReports,
} from '../db';

describe('db', () => {
  let db: ReturnType<typeof initDb>;

  beforeEach(() => {
    db = initDb(':memory:');
  });

  it('inserts and lists push subscriptions', () => {
    insertSubscription(db, {
      endpoint: 'https://push.example/abc',
      p256dh: 'key1',
      auth: 'auth1',
      min_magnitude: 4.0,
      nearby_radius_km: null,
      user_lat: null,
      user_lng: null,
    });

    const rows = getAllSubscriptions(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].endpoint).toBe('https://push.example/abc');
    expect(rows[0].min_magnitude).toBe(4.0);
  });

  it('upserts by endpoint instead of duplicating', () => {
    insertSubscription(db, {
      endpoint: 'https://push.example/abc',
      p256dh: 'key1',
      auth: 'auth1',
      min_magnitude: 4.0,
      nearby_radius_km: null,
      user_lat: null,
      user_lng: null,
    });
    insertSubscription(db, {
      endpoint: 'https://push.example/abc',
      p256dh: 'key1',
      auth: 'auth1',
      min_magnitude: 5.5,
      nearby_radius_km: 50,
      user_lat: 14.6,
      user_lng: -90.5,
    });

    const rows = getAllSubscriptions(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].min_magnitude).toBe(5.5);
  });

  it('deletes a subscription by endpoint', () => {
    insertSubscription(db, {
      endpoint: 'https://push.example/abc',
      p256dh: 'key1',
      auth: 'auth1',
      min_magnitude: 4.0,
      nearby_radius_km: null,
      user_lat: null,
      user_lng: null,
    });
    deleteSubscriptionByEndpoint(db, 'https://push.example/abc');
    expect(getAllSubscriptions(db)).toHaveLength(0);
  });

  it('tracks seen earthquakes', () => {
    expect(hasSeenEarthquake(db, 'usgs_1')).toBe(false);
    markEarthquakeSeen(db, 'usgs_1');
    expect(hasSeenEarthquake(db, 'usgs_1')).toBe(true);
  });

  it('inserts and lists community reports newest-first', () => {
    insertReport(db, {
      department: 'Escuintla',
      municipality: 'Puerto San José',
      feltIntensity: 'Fuerte',
      buildingType: 'Casa de 1 nivel',
      comments: 'Retumbo fuerte',
      timestamp: 1000,
      mercalliEstimated: 'Mercalli VI',
      earthquakeId: undefined,
    });
    insertReport(db, {
      department: 'Guatemala (Capital)',
      municipality: 'Zona 10',
      feltIntensity: 'Leve',
      buildingType: 'Edificio de apartamentos / oficinas',
      comments: undefined,
      timestamp: 2000,
      mercalliEstimated: 'Mercalli III',
      earthquakeId: undefined,
    });

    const rows = getAllReports(db);
    expect(rows).toHaveLength(2);
    expect(rows[0].timestamp).toBe(2000); // newest first
    expect(rows[1].department).toBe('Escuintla');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run server/__tests__/db.test.ts`
Expected: FAIL — `Cannot find module '../db'`

- [ ] **Step 4: Implement `server/db.ts`**

```typescript
// server/db.ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run server/__tests__/db.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Add data.db to .gitignore**

In `.gitignore`, append:

```
data.db
data.db-journal
data.db-wal
data.db-shm
```

- [ ] **Step 7: Commit**

```bash
git add server/db.ts server/__tests__/db.test.ts package.json package-lock.json .gitignore
git commit -m "feat: add SQLite persistence for subscriptions, seen earthquakes, and reports"
```

---

### Task 3: Server-side USGS fetch

**Files:**
- Create: `server/usgsServerFetch.ts`

**Interfaces:**
- Consumes: `calculateDistanceKm`, `calculateMercalliIntensity`, `getClosestGuatemalaDepartment` from `src/utils/seismicCalculations.ts` (already exported, reused as-is).
- Produces: `fetchLatestGuatemalaEarthquakes(): Promise<Earthquake[]>` — same `Earthquake` shape as `src/types.ts`, fetching the last 24h from USGS, no fallback data (the caller decides what to do on failure — this function throws on network error).

- [ ] **Step 1: Implement `server/usgsServerFetch.ts`**

This factors out the same parsing logic already in `src/services/usgsService.ts` (`fetchLiveGuatemalaEarthquakes`) but for server use: no `AbortSignal.timeout` browser quirks needed to change, same USGS query, always `timeframe = '24h'`, throws instead of returning a fallback (the watcher task decides how to handle failure).

```typescript
// server/usgsServerFetch.ts
import type { Earthquake } from '../src/types';
import {
  calculateDistanceKm,
  calculateMercalliIntensity,
  getClosestGuatemalaDepartment,
} from '../src/utils/seismicCalculations';

const USGS_BASE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

export async function fetchLatestGuatemalaEarthquakes(): Promise<Earthquake[]> {
  const starttime = new Date();
  starttime.setDate(starttime.getDate() - 1);

  const params = new URLSearchParams({
    format: 'geojson',
    minlatitude: '12.8',
    maxlatitude: '18.5',
    minlongitude: '-93.2',
    maxlongitude: '-87.2',
    minmagnitude: '2.5',
    starttime: starttime.toISOString(),
    orderby: 'time',
    limit: '80',
  });

  const response = await fetch(`${USGS_BASE_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`USGS HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.features || !Array.isArray(data.features)) {
    throw new Error('Respuesta inválida de USGS');
  }

  return data.features.map((item: any) => {
    const coords = item.geometry.coordinates;
    const lon = coords[0];
    const lat = coords[1];
    const depth = Math.round((coords[2] || 10) * 10) / 10;
    const mag = Math.round((item.properties.mag || 3.0) * 10) / 10;
    const distToCapital = calculateDistanceKm(lat, lon, 14.6349, -90.5069);
    const closestDept = getClosestGuatemalaDepartment(lat, lon);
    const mmi = calculateMercalliIntensity(mag, depth, distToCapital);

    return {
      id: item.id || `eq_${item.properties.time}`,
      magnitude: mag,
      place: item.properties.place || 'Guatemala',
      time: item.properties.time,
      updated: item.properties.updated || item.properties.time,
      depth,
      latitude: lat,
      longitude: lon,
      url: item.properties.url,
      status: item.properties.status,
      tsunami: item.properties.tsunami || 0,
      sig: item.properties.sig || Math.round(mag * 70),
      felt: item.properties.felt || undefined,
      alert: item.properties.alert || (mag >= 6.0 ? 'yellow' : mag >= 5.0 ? 'green' : null),
      department: closestDept.department,
      intensityMercalli: `${mmi.roman} - ${mmi.level}`,
      distanceToGuatemalaCityKm: distToCapital,
    } satisfies Earthquake;
  });
}
```

No dedicated test for this task — it's a thin I/O wrapper around a live external API. It's exercised indirectly through Task 4's watcher tests using injected fake data, and manually verified in Task 5's smoke test.

- [ ] **Step 2: Commit**

```bash
git add server/usgsServerFetch.ts
git commit -m "feat: add server-side USGS fetch for the watcher loop"
```

---

### Task 4: Notification selection logic + watcher orchestration

**Files:**
- Create: `server/seismicWatcher.ts`
- Test: `server/__tests__/seismicWatcher.test.ts`

**Interfaces:**
- Consumes: `Earthquake` from `src/types.ts`, `PushSubscriptionRow` from `server/db.ts`, `calculateDistanceKm` from `src/utils/seismicCalculations.ts`.
- Produces:
  - `selectNotifications(newQuakes: Earthquake[], subscriptions: PushSubscriptionRow[]): Array<{ subscription: PushSubscriptionRow; earthquake: Earthquake }>` — pure function, no I/O.
  - `pollAndNotify(deps: { db: Database.Database; fetchQuakes: () => Promise<Earthquake[]>; sendPush: (sub: PushSubscriptionRow, eq: Earthquake) => Promise<void> }): Promise<void>` — orchestration, injects dependencies so it's testable without real network/DB/push calls.

- [ ] **Step 1: Write the failing test for `selectNotifications`**

```typescript
// server/__tests__/seismicWatcher.test.ts
import { describe, it, expect, vi } from 'vitest';
import { selectNotifications, pollAndNotify } from '../seismicWatcher';
import type { Earthquake } from '../../src/types';
import type { PushSubscriptionRow } from '../db';

function makeQuake(overrides: Partial<Earthquake> = {}): Earthquake {
  return {
    id: 'eq_1',
    magnitude: 5.0,
    place: 'Escuintla',
    time: Date.now(),
    updated: Date.now(),
    depth: 20,
    latitude: 14.3,
    longitude: -90.7,
    url: 'https://earthquake.usgs.gov',
    status: 'reviewed',
    tsunami: 0,
    sig: 400,
    ...overrides,
  };
}

function makeSub(overrides: Partial<PushSubscriptionRow> = {}): PushSubscriptionRow {
  return {
    id: 1,
    endpoint: 'https://push.example/1',
    p256dh: 'k',
    auth: 'a',
    min_magnitude: 4.0,
    nearby_radius_km: null,
    user_lat: null,
    user_lng: null,
    created_at: Date.now(),
    ...overrides,
  };
}

describe('selectNotifications', () => {
  it('matches a subscriber whose threshold the magnitude meets', () => {
    const quake = makeQuake({ magnitude: 4.5 });
    const sub = makeSub({ min_magnitude: 4.0 });
    expect(selectNotifications([quake], [sub])).toEqual([{ subscription: sub, earthquake: quake }]);
  });

  it('excludes a subscriber whose threshold the magnitude misses and who has no nearby radius', () => {
    const quake = makeQuake({ magnitude: 3.0 });
    const sub = makeSub({ min_magnitude: 4.0, nearby_radius_km: null });
    expect(selectNotifications([quake], [sub])).toEqual([]);
  });

  it('matches a subscriber below threshold if the quake is within their nearby radius', () => {
    // Guatemala City coords; quake epicenter ~34km away (matches Escuintla fixture in usgsService)
    const quake = makeQuake({ magnitude: 3.0, latitude: 14.40, longitude: -90.72 });
    const sub = makeSub({
      min_magnitude: 5.0,
      nearby_radius_km: 50,
      user_lat: 14.6349,
      user_lng: -90.5069,
    });
    expect(selectNotifications([quake], [sub])).toEqual([{ subscription: sub, earthquake: quake }]);
  });

  it('excludes a subscriber below threshold if the quake is outside their nearby radius', () => {
    const quake = makeQuake({ magnitude: 3.0, latitude: 14.40, longitude: -90.72 });
    const sub = makeSub({
      min_magnitude: 5.0,
      nearby_radius_km: 10,
      user_lat: 14.6349,
      user_lng: -90.5069,
    });
    expect(selectNotifications([quake], [sub])).toEqual([]);
  });

  it('produces one entry per matching (quake, subscriber) pair across multiple quakes and subscribers', () => {
    const q1 = makeQuake({ id: 'eq_1', magnitude: 5.0 });
    const q2 = makeQuake({ id: 'eq_2', magnitude: 3.0 });
    const subHigh = makeSub({ id: 1, min_magnitude: 4.0 });
    const subLow = makeSub({ id: 2, min_magnitude: 2.0 });

    const result = selectNotifications([q1, q2], [subHigh, subLow]);
    expect(result).toHaveLength(3); // q1->subHigh, q1->subLow, q2->subLow
  });
});

describe('pollAndNotify', () => {
  it('marks new quakes as seen and sends push only to matching subscribers, skipping already-seen quakes', async () => {
    const quake = makeQuake({ id: 'eq_new', magnitude: 5.0 });
    const sub = makeSub({ min_magnitude: 4.0 });

    const db = {} as any; // opaque handle passed through to the injected functions below
    const fetchQuakes = vi.fn().mockResolvedValue([quake]);
    const sendPush = vi.fn().mockResolvedValue(undefined);
    const hasSeenEarthquake = vi.fn().mockReturnValue(false);
    const markEarthquakeSeen = vi.fn();
    const getAllSubscriptions = vi.fn().mockReturnValue([sub]);

    await pollAndNotify({
      db,
      fetchQuakes,
      sendPush,
      hasSeenEarthquake,
      markEarthquakeSeen,
      getAllSubscriptions,
    });

    expect(sendPush).toHaveBeenCalledWith(sub, quake);
    expect(markEarthquakeSeen).toHaveBeenCalledWith(db, 'eq_new');
  });

  it('does not notify or re-mark an already-seen quake', async () => {
    const quake = makeQuake({ id: 'eq_old', magnitude: 5.0 });
    const sub = makeSub({ min_magnitude: 4.0 });

    const db = {} as any;
    const fetchQuakes = vi.fn().mockResolvedValue([quake]);
    const sendPush = vi.fn().mockResolvedValue(undefined);
    const hasSeenEarthquake = vi.fn().mockReturnValue(true);
    const markEarthquakeSeen = vi.fn();
    const getAllSubscriptions = vi.fn().mockReturnValue([sub]);

    await pollAndNotify({
      db,
      fetchQuakes,
      sendPush,
      hasSeenEarthquake,
      markEarthquakeSeen,
      getAllSubscriptions,
    });

    expect(sendPush).not.toHaveBeenCalled();
    expect(markEarthquakeSeen).not.toHaveBeenCalled();
  });

  it('swallows fetch errors without throwing', async () => {
    const fetchQuakes = vi.fn().mockRejectedValue(new Error('USGS down'));
    const sendPush = vi.fn();
    const hasSeenEarthquake = vi.fn();
    const markEarthquakeSeen = vi.fn();
    const getAllSubscriptions = vi.fn().mockReturnValue([]);

    await expect(
      pollAndNotify({
        db: {} as any,
        fetchQuakes,
        sendPush,
        hasSeenEarthquake,
        markEarthquakeSeen,
        getAllSubscriptions,
      })
    ).resolves.toBeUndefined();
    expect(sendPush).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server/__tests__/seismicWatcher.test.ts`
Expected: FAIL — `Cannot find module '../seismicWatcher'`

- [ ] **Step 3: Implement `server/seismicWatcher.ts`**

```typescript
// server/seismicWatcher.ts
import type { Database } from 'better-sqlite3';
import type { Earthquake } from '../src/types';
import type { PushSubscriptionRow } from './db';
import { calculateDistanceKm } from '../src/utils/seismicCalculations';

export function selectNotifications(
  newQuakes: Earthquake[],
  subscriptions: PushSubscriptionRow[]
): Array<{ subscription: PushSubscriptionRow; earthquake: Earthquake }> {
  const matches: Array<{ subscription: PushSubscriptionRow; earthquake: Earthquake }> = [];

  for (const earthquake of newQuakes) {
    for (const subscription of subscriptions) {
      if (earthquake.magnitude >= subscription.min_magnitude) {
        matches.push({ subscription, earthquake });
        continue;
      }

      if (
        subscription.nearby_radius_km != null &&
        subscription.user_lat != null &&
        subscription.user_lng != null
      ) {
        const distanceKm = calculateDistanceKm(
          subscription.user_lat,
          subscription.user_lng,
          earthquake.latitude,
          earthquake.longitude
        );
        if (distanceKm <= subscription.nearby_radius_km) {
          matches.push({ subscription, earthquake });
        }
      }
    }
  }

  return matches;
}

interface PollDeps {
  db: Database;
  fetchQuakes: () => Promise<Earthquake[]>;
  sendPush: (sub: PushSubscriptionRow, eq: Earthquake) => Promise<void>;
  hasSeenEarthquake: (db: Database, usgsId: string) => boolean;
  markEarthquakeSeen: (db: Database, usgsId: string) => void;
  getAllSubscriptions: (db: Database) => PushSubscriptionRow[];
}

export async function pollAndNotify(deps: PollDeps): Promise<void> {
  let quakes: Earthquake[];
  try {
    quakes = await deps.fetchQuakes();
  } catch (err) {
    console.warn('seismicWatcher: fallo consultando USGS, se reintenta en el próximo ciclo:', err);
    return;
  }

  const newQuakes = quakes.filter((q) => !deps.hasSeenEarthquake(deps.db, q.id));
  if (newQuakes.length === 0) return;

  const subscriptions = deps.getAllSubscriptions(deps.db);
  const notifications = selectNotifications(newQuakes, subscriptions);

  for (const { subscription, earthquake } of notifications) {
    await deps.sendPush(subscription, earthquake);
  }

  for (const quake of newQuakes) {
    deps.markEarthquakeSeen(deps.db, quake.id);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server/__tests__/seismicWatcher.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add server/seismicWatcher.ts server/__tests__/seismicWatcher.test.ts
git commit -m "feat: add earthquake watcher with threshold and nearby-radius matching"
```

---

### Task 5: Push service, VAPID setup, and REST endpoints wired into server.ts

**Files:**
- Create: `server/pushService.ts`
- Modify: `server.ts:1-10` (imports and setup), and append new endpoint handlers + watcher interval before `startServer()`
- Modify: `.env.example` (add VAPID variables)
- Modify: `package.json` (add `web-push`, `@types/web-push`)

**Interfaces:**
- Consumes: `initDb`, `insertSubscription`, `deleteSubscriptionByEndpoint`, `getAllSubscriptions`, `hasSeenEarthquake`, `markEarthquakeSeen`, `insertReport`, `getAllReports` from `server/db.ts`; `pollAndNotify` from `server/seismicWatcher.ts`; `fetchLatestGuatemalaEarthquakes` from `server/usgsServerFetch.ts`.
- Produces: running Express endpoints `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `GET /api/reports`, `POST /api/reports`; `GET /api/push/vapid-public-key` (so the frontend can subscribe without hardcoding the key).

- [ ] **Step 1: Install web-push and generate VAPID keys**

Run: `npm install web-push && npm install -D @types/web-push`
Run: `npx web-push generate-vapid-keys`

Copy the printed `Public Key` and `Private Key` — they're needed in Step 2.

- [ ] **Step 2: Add VAPID variables to `.env.example`**

Append to `.env.example`:

```
# VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY: generated once via `npx web-push generate-vapid-keys`.
# Required for sending Web Push notifications.
VAPID_PUBLIC_KEY="MY_VAPID_PUBLIC_KEY"
VAPID_PRIVATE_KEY="MY_VAPID_PRIVATE_KEY"
```

Then create a local `.env` (not committed — already covered by existing `.gitignore` patterns for `.env`; verify with `git check-ignore .env`) with the real generated keys.

- [ ] **Step 3: Implement `server/pushService.ts`**

```typescript
// server/pushService.ts
import webpush from 'web-push';
import type { Earthquake } from '../src/types';
import type { PushSubscriptionRow } from './db';

export function configurePushService(publicKey: string, privateKey: string): void {
  webpush.setVapidDetails('mailto:alertas@example.gt', publicKey, privateKey);
}

export async function sendEarthquakePush(
  sub: PushSubscriptionRow,
  earthquake: Earthquake,
  onExpired: (endpoint: string) => void
): Promise<void> {
  const payload = JSON.stringify({
    title: `M${earthquake.magnitude.toFixed(1)} · ${earthquake.place}`,
    body: 'Sismo confirmado — revisa tu zona y sigue el protocolo de seguridad.',
    earthquakeId: earthquake.id,
    url: `/?eq=${earthquake.id}`,
  });

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      onExpired(sub.endpoint);
    } else {
      console.warn('pushService: fallo enviando notificación a', sub.endpoint, err.message);
    }
  }
}
```

- [ ] **Step 4: Wire it all into `server.ts`**

At the top of `server.ts`, add imports (after the existing `dotenv.config()` call so `process.env` is populated first):

```typescript
import {
  initDb,
  insertSubscription,
  deleteSubscriptionByEndpoint,
  getAllSubscriptions,
  hasSeenEarthquake,
  markEarthquakeSeen,
  insertReport,
  getAllReports,
} from './server/db';
import { pollAndNotify } from './server/seismicWatcher';
import { fetchLatestGuatemalaEarthquakes } from './server/usgsServerFetch';
import { configurePushService, sendEarthquakePush } from './server/pushService';
```

After `app.use(express.json());`, add:

```typescript
const db = initDb(process.env.DB_PATH || 'data.db');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  configurePushService(process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

app.post('/api/push/subscribe', (req, res) => {
  const { endpoint, keys, minMagnitude, nearbyRadiusKm, userLat, userLng } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth || typeof minMagnitude !== 'number') {
    return res.status(400).json({ error: 'Suscripción inválida' });
  }
  insertSubscription(db, {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    min_magnitude: minMagnitude,
    nearby_radius_km: nearbyRadiusKm ?? null,
    user_lat: userLat ?? null,
    user_lng: userLng ?? null,
  });
  res.json({ status: 'subscribed' });
});

app.post('/api/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'endpoint requerido' });
  deleteSubscriptionByEndpoint(db, endpoint);
  res.json({ status: 'unsubscribed' });
});

app.get('/api/reports', (req, res) => {
  res.json({ reports: getAllReports(db) });
});

app.post('/api/reports', (req, res) => {
  const { department, municipality, feltIntensity, buildingType, comments, timestamp, mercalliEstimated, earthquakeId } = req.body;
  if (!department || !municipality || !feltIntensity || !buildingType || !timestamp || !mercalliEstimated) {
    return res.status(400).json({ error: 'Reporte incompleto' });
  }
  const report = insertReport(db, {
    department,
    municipality,
    feltIntensity,
    buildingType,
    comments,
    timestamp,
    mercalliEstimated,
    earthquakeId,
  });
  res.json({ report });
});

// Earthquake watcher: polls USGS every 30s and pushes to qualifying subscribers.
setInterval(() => {
  pollAndNotify({
    db,
    fetchQuakes: fetchLatestGuatemalaEarthquakes,
    sendPush: (sub, eq) => sendEarthquakePush(sub, eq, (endpoint) => deleteSubscriptionByEndpoint(db, endpoint)),
    hasSeenEarthquake,
    markEarthquakeSeen,
    getAllSubscriptions,
  });
}, 30000);
```

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
Then in another terminal: `curl -X POST http://localhost:3000/api/reports -H "Content-Type: application/json" -d '{"department":"Escuintla","municipality":"Test","feltIntensity":"Leve","buildingType":"Casa de 1 nivel","timestamp":1700000000000,"mercalliEstimated":"Mercalli III"}'`
Expected: JSON response with the inserted report including an `id`.
Then: `curl http://localhost:3000/api/reports`
Expected: JSON array containing the report just inserted.

- [ ] **Step 6: Commit**

```bash
git add server/pushService.ts server.ts .env.example package.json package-lock.json
git commit -m "feat: wire push service, watcher interval, and REST endpoints into the server"
```

---

### Task 6: Frontend service worker + push subscription flow

**Files:**
- Create: `public/sw.js`
- Create: `src/services/pushSubscriptionService.ts`
- Create: `src/components/NotificationSettings.tsx`
- Modify: `src/App.tsx` (mount `NotificationSettings` in a new nav tab, or inside the existing `emergency` tab section — placed inside the `emergency` tab per Task 8's App.tsx changes, added here as a standalone render call the App.tsx task will wire in)

**Interfaces:**
- Produces:
  - `public/sw.js`: listens for `push` events, calls `self.registration.showNotification(title, { body, data: { url } })`; listens for `notificationclick`, opens/focuses `data.url`.
  - `subscribeToPush(minMagnitude: number, nearbyRadiusKm: number | null, userLat: number | null, userLng: number | null): Promise<void>` — registers `sw.js`, requests `Notification.requestPermission()`, subscribes via `PushManager`, POSTs to `/api/push/subscribe`.
  - `unsubscribeFromPush(): Promise<void>` — POSTs to `/api/push/unsubscribe` and calls `.unsubscribe()` on the browser subscription.
  - `<NotificationSettings />` — no props; self-contained UI with a magnitude slider (default 4.0), a "cerca de mí" toggle + radius input (default 50km, uses `navigator.geolocation` already-pattern from `App.tsx`), and subscribe/unsubscribe buttons.

- [ ] **Step 1: Implement `public/sw.js`**

```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Alerta Sísmica Guatemala';
  const options = {
    body: data.body || 'Nuevo sismo detectado.',
    icon: '/assets/icon-192.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
```

- [ ] **Step 2: Implement `src/services/pushSubscriptionService.ts`**

```typescript
// src/services/pushSubscriptionService.ts
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(
  minMagnitude: number,
  nearbyRadiusKm: number | null,
  userLat: number | null,
  userLng: number | null
): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador no soporta notificaciones push');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones no concedido');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const { publicKey } = await fetch('/api/push/vapid-public-key').then((r) => r.json());
  if (!publicKey) {
    throw new Error('El servidor no tiene configurada la clave VAPID');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      minMagnitude,
      nearbyRadiusKm,
      userLat,
      userLng,
    }),
  });
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
```

- [ ] **Step 3: Implement `src/components/NotificationSettings.tsx`**

```tsx
// src/components/NotificationSettings.tsx
import React, { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { subscribeToPush, unsubscribeFromPush } from '../services/pushSubscriptionService';

export const NotificationSettings: React.FC = () => {
  const [minMagnitude, setMinMagnitude] = useState<number>(4.0);
  const [nearbyEnabled, setNearbyEnabled] = useState<boolean>(false);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubscribe = async () => {
    setErrorMessage('');
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      if (nearbyEnabled) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
      await subscribeToPush(minMagnitude, nearbyEnabled ? radiusKm : null, lat, lng);
      setStatus('subscribed');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'No se pudo activar las notificaciones');
    }
  };

  const handleUnsubscribe = async () => {
    await unsubscribeFromPush();
    setStatus('idle');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
        <Bell className="w-4 h-4 text-blue-900" />
        Notificaciones de Sismos
      </h3>

      <div>
        <label className="text-xs font-bold text-slate-700 block mb-1">
          Notificarme desde magnitud: <span className="text-blue-900">{minMagnitude.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={2.5}
          max={7.0}
          step={0.1}
          value={minMagnitude}
          onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="nearby-toggle"
          type="checkbox"
          checked={nearbyEnabled}
          onChange={(e) => setNearbyEnabled(e.target.checked)}
        />
        <label htmlFor="nearby-toggle" className="text-xs font-bold text-slate-700">
          Avisarme de sismos menores si están cerca de mí (usa tu ubicación GPS)
        </label>
      </div>

      {nearbyEnabled && (
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Radio: <span className="text-blue-900">{radiusKm} km</span>
          </label>
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>
      )}

      {status === 'subscribed' ? (
        <button
          onClick={handleUnsubscribe}
          className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          <BellOff className="w-3.5 h-3.5" />
          Desactivar Notificaciones
        </button>
      ) : (
        <button
          onClick={handleSubscribe}
          className="w-full py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          <Bell className="w-3.5 h-3.5" />
          Activar Notificaciones
        </button>
      )}

      {status === 'error' && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{errorMessage}</p>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the app in Chrome, navigate to wherever `NotificationSettings` is rendered (wired in Task 8), click "Activar Notificaciones", grant the browser permission prompt.
Expected: no console errors; `navigator.serviceWorker.getRegistration('/sw.js')` returns a registration when checked in DevTools console.

- [ ] **Step 5: Commit**

```bash
git add public/sw.js src/services/pushSubscriptionService.ts src/components/NotificationSettings.tsx
git commit -m "feat: add service worker, push subscription flow, and notification settings UI"
```

---

### Task 7: Reports service — migrate CommunityReports to the backend

**Files:**
- Create: `src/services/reportsService.ts`
- Modify: `src/components/CommunityReports.tsx:1-49` (props and submit handler)
- Modify: `src/App.tsx:53-85, 160-162` (remove local `communityReports` seed state, fetch from backend instead)

**Interfaces:**
- Produces: `fetchReports(): Promise<CommunityReport[]>`, `submitReport(report: Omit<CommunityReport, 'id'>): Promise<CommunityReport>`.
- Consumes: `CommunityReport` type from `src/types.ts` (unchanged shape).

- [ ] **Step 1: Implement `src/services/reportsService.ts`**

```typescript
// src/services/reportsService.ts
import { CommunityReport } from '../types';

export async function fetchReports(): Promise<CommunityReport[]> {
  const res = await fetch('/api/reports');
  const data = await res.json();
  return data.reports.map((r: any) => ({ ...r, id: String(r.id) }));
}

export async function submitReport(report: Omit<CommunityReport, 'id'>): Promise<CommunityReport> {
  const res = await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
  });
  const data = await res.json();
  return { ...data.report, id: String(data.report.id) };
}
```

- [ ] **Step 2: Update `src/components/CommunityReports.tsx`**

Replace the `onAddReport` prop usage: change the interface and `handleSubmit` to call `submitReport` and then invoke a new `onReportAdded` callback with the server-confirmed report (which now has a real `id`), instead of building the `id` client-side.

In `CommunityReportsProps`, change:
```typescript
interface CommunityReportsProps {
  reports: CommunityReport[];
  onReportAdded: (report: CommunityReport) => void;
}
```

In `handleSubmit`, replace the body from `const newReport: CommunityReport = {...}` through `onAddReport(newReport);` with:

```typescript
    const { submitReport } = await import('../services/reportsService');
    const newReport = await submitReport({
      department: selectedDept,
      municipality: municipality || 'Cabecera',
      feltIntensity,
      buildingType,
      comments: comments.trim() || undefined,
      timestamp: Date.now(),
      mercalliEstimated: `Mercalli ${mercalli}`,
    });

    onReportAdded(newReport);
```

(Use a top-level `import { submitReport } from '../services/reportsService';` instead of the dynamic import shown above — the dynamic import is only illustrative of placement; add it alongside the existing imports at the top of the file.)

Also change `handleSubmit` to `async (e: React.FormEvent) => { ... }` since it now awaits `submitReport`.

- [ ] **Step 3: Update `src/App.tsx`**

Replace the seeded `communityReports` state (lines with the three hardcoded `cr_1`/`cr_2`/`cr_3` objects) with:

```typescript
const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
```

Add a new `useEffect` (near the existing `loadEarthquakes` effect) that fetches reports on mount:

```typescript
useEffect(() => {
  fetchReports().then(setCommunityReports).catch(() => setCommunityReports([]));
}, []);
```

Add the import: `import { fetchReports } from './services/reportsService';`

Rename `handleAddCommunityReport` to match the new prop name and prepend the server-confirmed report:

```typescript
const handleReportAdded = (rep: CommunityReport) => {
  setCommunityReports((prev) => [rep, ...prev]);
};
```

Update the `<CommunityReports ... />` usage to pass `onReportAdded={handleReportAdded}` instead of `onAddReport={handleAddCommunityReport}`.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open the "¿Lo Sentiste?" tab, submit a report, refresh the page.
Expected: the submitted report is still there after refresh (proves it round-tripped through the backend, not just local state).

- [ ] **Step 5: Commit**

```bash
git add src/services/reportsService.ts src/components/CommunityReports.tsx src/App.tsx
git commit -m "feat: persist community reports through the backend instead of local state"
```

---

## Fase 2 — UX de crisis

### Task 8: Always-visible action directive + notification click-through

**Files:**
- Modify: `src/components/AlertBanner.tsx:136-141`
- Modify: `src/App.tsx` (read `?eq=` query param on mount)

**Interfaces:**
- Consumes: `handleSimulateEarthquake(eq: Earthquake)` (already exists in `src/App.tsx`), `earthquakes` state (already exists).

- [ ] **Step 1: Make the action directive always visible**

In `src/components/AlertBanner.tsx`, change:

```tsx
              <div className="hidden sm:block text-left text-[11px] bg-red-950/70 px-3 py-1.5 rounded-lg border border-red-800 font-bold">
```

to:

```tsx
              <div className="block text-left text-[11px] bg-red-950/70 px-3 py-1.5 rounded-lg border border-red-800 font-bold">
```

This is the entire structural change needed here — the component already leads with magnitude and distance; it was only the "Agáchate/Cúbrete/Sujétate" directive that was hidden on small screens, which is precisely the highest-priority information in a crisis.

- [ ] **Step 2: Wire notification click-through in `src/App.tsx`**

Add a `useEffect` (after the `loadEarthquakes` effect, once `earthquakes` state is populated) that checks for `?eq=<id>` in the URL and triggers the same flow as clicking an earthquake in the feed:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const eqId = params.get('eq');
  if (!eqId || earthquakes.length === 0) return;

  const target = earthquakes.find((eq) => eq.id === eqId);
  if (target) {
    handleSimulateEarthquake(target);
    window.history.replaceState({}, '', window.location.pathname);
  }
}, [earthquakes]);
```

Place this after `handleSimulateEarthquake` is defined (function declarations via `const` are not hoisted, so the effect must appear after it in the file, or reference it via a stable callback — since `handleSimulateEarthquake` is already defined mid-component before the `return`, placing this effect directly below it satisfies ordering).

- [ ] **Step 3: Manual verification**

Run: `npm run dev`. Note an earthquake `id` from the feed (e.g. via DevTools Network tab or the visible list), then navigate to `http://localhost:3000/?eq=<that-id>`.
Expected: the alert banner appears immediately for that earthquake, matching what clicking "Simular" on it in the feed does.

- [ ] **Step 4: Commit**

```bash
git add src/components/AlertBanner.tsx src/App.tsx
git commit -m "fix: always show crisis directive on mobile; support notification click-through via ?eq= param"
```

---

## Fase 3 — PWA offline

### Task 9: Manifest + offline caching for static content

**Files:**
- Create: `public/manifest.json`
- Modify: `public/sw.js` (add install/fetch handlers for cache-first static assets)
- Modify: `index.html` (link the manifest)

**Interfaces:**
- Produces: installable PWA; `EmergencyGuide` and app shell available offline.

- [ ] **Step 1: Create `public/manifest.json`**

```json
{
  "name": "Alerta Sísmica Guatemala",
  "short_name": "Alerta GT",
  "description": "Monitoreo y alerta sísmica en tiempo real para Guatemala",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#7f1d1d",
  "icons": [
    { "src": "/assets/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Note: if `public/assets/icon-192.png` and `icon-512.png` don't already exist, generate placeholder PNGs at those sizes from the existing `assets/` directory content before this task is considered complete — check `ls assets/` first for a usable source image.

- [ ] **Step 2: Extend `public/sw.js` with cache-first static caching**

Add to the top of `public/sw.js` (above the existing `push`/`notificationclick` listeners):

```javascript
const STATIC_CACHE = 'alerta-gt-static-v1';
const STATIC_ASSETS = ['/', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Only cache-first the app shell and static GET requests; never intercept /api/ calls.
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
    })
  );
});
```

- [ ] **Step 3: Link the manifest and register the service worker in `index.html`**

In `index.html`, inside `<head>`, add:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#7f1d1d" />
```

Confirm the service worker registration already happens via `subscribeToPush` (Task 6) — that's sufficient for push, but for offline caching to work even without notifications enabled, register unconditionally. In `src/main.tsx`, after the existing render call, add:

```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('SW registration failed:', err));
  });
}
```

- [ ] **Step 4: Manual verification**

Run: `npm run build && npm start` (production mode, since Vite's dev middleware bypasses some static serving assumptions). Open the app, wait for it to load once online, then in DevTools → Network tab, check "Offline", and reload.
Expected: the app shell still loads (does not show the browser's default offline error page). Live earthquake data will fail to update (expected — no network), but the cached last-loaded page renders.

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/sw.js index.html src/main.tsx
git commit -m "feat: add PWA manifest and offline caching for the app shell"
```

---

## Self-Review Notes

- **Spec coverage:** DB/persistence (Task 2), server-side USGS fetch (Task 3), notification matching + watcher (Task 4), push service + REST endpoints (Task 5), frontend push subscription + settings UI (Task 6), community reports persistence (Task 7), crisis UX directive visibility + click-through (Task 8), PWA manifest + offline caching (Task 9) — all Fase 1/2/3 items from the spec are covered. VAPID key generation is covered in Task 5 Step 1. The spec's testing section for Fase 1 (watcher + endpoint tests) is covered by Tasks 2 and 4; Fase 2/3 manual verification is covered by Task 8 Step 3 and Task 9 Step 4.
- **Type consistency:** `PushSubscriptionRow`, `CommunityReportRow` defined once in `server/db.ts` and reused verbatim in `server/seismicWatcher.ts`, `server/pushService.ts`, and `server.ts`. `CommunityReport` (frontend type) stays unchanged in `src/types.ts`; `reportsService.ts` bridges the numeric backend `id` to the frontend's `string` `id` field via `String(r.id)`.
- **No placeholders:** every step has concrete, complete code — no TBDs or "similar to Task N" references. Task 2's `insertReport` was corrected during self-review to remove an earlier draft's bug.
