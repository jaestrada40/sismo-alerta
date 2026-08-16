// server/mergedEarthquakeFetch.ts
//
// Combines USGS (broad, reliable, official API) with INSIVUMEH's scraped latest
// event (local sensors, catches smaller/nearer events USGS misses or reports much
// later). If INSIVUMEH's scrape fails for any reason, we still return USGS's list —
// this must never let a broken scraper take down earthquake detection entirely.
import type { Earthquake } from '../src/types';
import { calculateDistanceKm } from '../src/utils/seismicCalculations';
import { fetchLatestGuatemalaEarthquakes } from './usgsServerFetch';
import { fetchLatestInsivumehEarthquake } from './insivumehScraper';

const SAME_EVENT_TIME_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const SAME_EVENT_DISTANCE_TOLERANCE_KM = 75;

export function isLikelySameEvent(a: Earthquake, b: Earthquake): boolean {
  const timeDiffMs = Math.abs(a.time - b.time);
  if (timeDiffMs > SAME_EVENT_TIME_TOLERANCE_MS) return false;

  const distanceKm = calculateDistanceKm(a.latitude, a.longitude, b.latitude, b.longitude);
  return distanceKm <= SAME_EVENT_DISTANCE_TOLERANCE_KM;
}

export async function fetchAllGuatemalaEarthquakes(): Promise<Earthquake[]> {
  const usgsQuakes = await fetchLatestGuatemalaEarthquakes();

  let insivumehQuake: Earthquake | null = null;
  try {
    insivumehQuake = await fetchLatestInsivumehEarthquake();
  } catch (err: any) {
    console.warn('mergedEarthquakeFetch: fallo consultando INSIVUMEH, se usa solo USGS:', err.message);
  }

  if (!insivumehQuake) {
    return usgsQuakes;
  }

  const alreadyCoveredByUsgs = usgsQuakes.some((q) => isLikelySameEvent(q, insivumehQuake!));
  if (alreadyCoveredByUsgs) {
    return usgsQuakes;
  }

  return [insivumehQuake, ...usgsQuakes];
}
