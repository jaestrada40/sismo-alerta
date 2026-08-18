// server/mergedEarthquakeFetch.ts
//
// Combines three independent sources so the watcher notifies on whichever
// reports an event first, and a single source's outage or bad data never blocks
// detection entirely. Fetch order is also priority order: when two sources
// report the same physical event with slightly different values (magnitude,
// place), the earlier source in this list wins — mergeUnique keeps whichever
// version was added to the combined list first.
//
//   1. EMSC: aggregates ~100+ regional networks; measured ~169s faster than
//      USGS for a real event, and has caught several regional quakes (M3-4.4
//      off Chiapas/El Salvador/Honduras) that USGS never reported at all.
//      No CORS (server-side only). Primary source given this track record.
//   2. INSIVUMEH: local Guatemalan sensors via best-effort scraping (see
//      insivumehScraper.ts) — catches smaller/nearer events the international
//      networks miss or report much later.
//   3. USGS: broad, official API (CORS-enabled, also used by the frontend
//      feed directly) — reliable fallback, but has proven slower and less
//      complete than EMSC for this region.
//
// Each source's failure is caught independently; the merge proceeds with
// whatever succeeded. Events are deduplicated across sources by time+location
// proximity so the same physical event never triggers two notifications.
import type { Earthquake } from '../src/types';
import { calculateDistanceKm } from '../src/utils/seismicCalculations';
import { fetchLatestGuatemalaEarthquakes } from './usgsServerFetch';
import { fetchLatestGuatemalaEarthquakesFromEmsc } from './emscFetch';
import { fetchRecentInsivumehEarthquakes } from './insivumehScraper';

const SAME_EVENT_TIME_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const SAME_EVENT_DISTANCE_TOLERANCE_KM = 75;

export function isLikelySameEvent(a: Earthquake, b: Earthquake): boolean {
  const timeDiffMs = Math.abs(a.time - b.time);
  if (timeDiffMs > SAME_EVENT_TIME_TOLERANCE_MS) return false;

  const distanceKm = calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
  return distanceKm <= SAME_EVENT_DISTANCE_TOLERANCE_KM;
}

/** Appends `candidates` to `combined`, skipping any that match an event already present. */
export function mergeUnique(combined: Earthquake[], candidates: Earthquake[]): Earthquake[] {
  const result = [...combined];
  for (const candidate of candidates) {
    const alreadyPresent = result.some((existing) => isLikelySameEvent(existing, candidate));
    if (!alreadyPresent) {
      result.push(candidate);
    }
  }
  return result;
}

interface MergedFetchDeps {
  fetchUsgs: () => Promise<Earthquake[]>;
  fetchEmsc: () => Promise<Earthquake[]>;
  fetchInsivumeh: () => Promise<Earthquake[]>;
}

const defaultDeps: MergedFetchDeps = {
  fetchUsgs: fetchLatestGuatemalaEarthquakes,
  fetchEmsc: fetchLatestGuatemalaEarthquakesFromEmsc,
  fetchInsivumeh: fetchRecentInsivumehEarthquakes,
};

export async function fetchAllGuatemalaEarthquakes(
  deps: MergedFetchDeps = defaultDeps
): Promise<Earthquake[]> {
  let combined: Earthquake[] = [];

  try {
    combined = await deps.fetchEmsc();
  } catch (err: any) {
    console.warn('mergedEarthquakeFetch: fallo consultando EMSC:', err.message);
  }

  try {
    const insivumehQuakes = await deps.fetchInsivumeh();
    combined = mergeUnique(combined, insivumehQuakes);
  } catch (err: any) {
    console.warn('mergedEarthquakeFetch: fallo consultando INSIVUMEH:', err.message);
  }

  try {
    const usgsQuakes = await deps.fetchUsgs();
    combined = mergeUnique(combined, usgsQuakes);
  } catch (err: any) {
    console.warn('mergedEarthquakeFetch: fallo consultando USGS:', err.message);
  }

  return combined;
}
