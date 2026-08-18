// server/insivumehScraper.ts
//
// INSIVUMEH has no public API. This scrapes the "último sismo" (latest earthquake)
// page of its geo dashboard — a Folium-rendered map with earthquake details in the
// marker tooltip HTML. Deliberately best-effort: if INSIVUMEH changes their page
// structure, this throws and the caller (mergedEarthquakeFetch) simply skips this
// source for that poll cycle, falling back to USGS alone.
import type { Earthquake } from '../src/types';
import {
  calculateDistanceKm,
  calculateMercalliIntensity,
  getClosestGuatemalaDepartment,
} from '../src/utils/seismicCalculations';

const ULTIMO_SISMO_URL = 'https://geo.insivumeh.gob.gt/ULTIMO_SISMO';

// INSIVUMEH publishes times in Guatemala local time (UTC-6, no DST).
const GUATEMALA_UTC_OFFSET_MS = 6 * 60 * 60 * 1000;

export interface InsivumehEvent {
  magnitude: number;
  originTime: string; // "YYYY-MM-DD HH:MM:SS", Guatemala local time
  latitude: number;
  longitude: number;
  depthKm: number;
  id: string;
}

export function parseUltimoSismoHtml(html: string): InsivumehEvent {
  const magnitude = html.match(/Magnitud:\s*<\/b>\s*([\d.]+)/)?.[1];
  const originTime = html.match(/Tiempo de Origen:\s*<\/b>\s*([\d]{4}-[\d]{2}-[\d]{2} [\d]{2}:[\d]{2}:[\d]{2})/)?.[1];
  const latitude = html.match(/Latitud:\s*<\/b>\s*([\d.\-]+)/)?.[1];
  const longitude = html.match(/Longitud:\s*<\/b>\s*([\d.\-]+)/)?.[1];
  const depth = html.match(/Profundidad:\s*<\/b>\s*([\d.]+)\s*km/)?.[1];
  const id = html.match(/ID:\s*<\/b>\s*(\S+)/)?.[1];

  if (!magnitude || !originTime || !latitude || !longitude || !depth || !id) {
    throw new Error('No se pudo extraer el sismo del HTML de INSIVUMEH (estructura de página cambió)');
  }

  return {
    magnitude: parseFloat(magnitude),
    originTime,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    depthKm: parseFloat(depth),
    id: `insivumeh_${id}`,
  };
}

function guatemalaLocalTimeToUtcMs(originTime: string): number {
  // "YYYY-MM-DD HH:MM:SS" has no timezone; Date.parse would treat it as UTC
  // (via the space->T normalization) or local-to-this-process, neither of which
  // is correct — it's Guatemala local time, so we parse the components explicitly.
  const [datePart, timePart] = originTime.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asIfUtc + GUATEMALA_UTC_OFFSET_MS;
}

export function insivumehEventToEarthquake(event: InsivumehEvent): Earthquake {
  const timeMs = guatemalaLocalTimeToUtcMs(event.originTime);
  const distToCapital = calculateDistanceKm(event.latitude, event.longitude, 14.6349, -90.5069);
  const closestDept = getClosestGuatemalaDepartment(event.latitude, event.longitude);
  const mmi = calculateMercalliIntensity(event.magnitude, event.depthKm, distToCapital);

  return {
    id: event.id,
    magnitude: Math.round(event.magnitude * 10) / 10,
    place: closestDept.isWithinGuatemala
      ? `Cerca de ${closestDept.department}`
      : `Fuera de Guatemala, cerca de ${closestDept.department}`,
    time: timeMs,
    updated: timeMs,
    depth: event.depthKm,
    latitude: event.latitude,
    longitude: event.longitude,
    url: 'https://geo.insivumeh.gob.gt/ULTIMO_SISMO',
    status: 'reviewed',
    tsunami: 0,
    sig: Math.round(event.magnitude * 70),
    alert: event.magnitude >= 6.0 ? 'yellow' : event.magnitude >= 5.0 ? 'green' : null,
    department: closestDept.isWithinGuatemala ? closestDept.department : 'Fuera de Guatemala',
    intensityMercalli: `${mmi.roman} - ${mmi.level}`,
    distanceToGuatemalaCityKm: distToCapital,
  };
}

export async function fetchLatestInsivumehEarthquake(): Promise<Earthquake> {
  const response = await fetch(ULTIMO_SISMO_URL, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'AlertaSismicaGuatemala/1.0 (+https://github.com/jaestrada40/sismo-alerta)' },
  });

  if (!response.ok) {
    throw new Error(`INSIVUMEH HTTP ${response.status}`);
  }

  const html = await response.text();
  const event = parseUltimoSismoHtml(html);
  return insivumehEventToEarthquake(event);
}

// INSIVUMEH's "ULTIMO_SISMO" page only ever shows their single most recent
// event — if it gets replaced by a newer one between polls, the previous
// event would otherwise vanish from our data entirely. This module-level
// cache accumulates each distinct event seen across polls (in this server
// process's lifetime) so it stays visible for RECENT_EVENTS_WINDOW_MS after
// capture, same as the other sources.
const RECENT_EVENTS_WINDOW_MS = 24 * 60 * 60 * 1000;
const recentInsivumehEvents = new Map<string, Earthquake>();

export function _resetInsivumehCacheForTests(): void {
  recentInsivumehEvents.clear();
}

export async function fetchRecentInsivumehEarthquakes(): Promise<Earthquake[]> {
  const latest = await fetchLatestInsivumehEarthquake();
  recentInsivumehEvents.set(latest.id, latest);

  const cutoff = Date.now() - RECENT_EVENTS_WINDOW_MS;
  for (const [id, event] of recentInsivumehEvents) {
    if (event.time < cutoff) recentInsivumehEvents.delete(id);
  }

  return [...recentInsivumehEvents.values()];
}
