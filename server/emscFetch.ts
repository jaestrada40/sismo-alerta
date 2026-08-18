// server/emscFetch.ts
//
// EMSC (European-Mediterranean Seismological Centre) aggregates ~100+ regional
// seismological networks in near-real-time and, per our own live measurement,
// published a real M5.1 event ~169s before USGS did. Public FDSN-compliant API,
// but no CORS headers — must be called server-side only (verified: no
// Access-Control-Allow-Origin on their responses), unlike USGS.
import type { Earthquake } from '../src/types';
import {
  calculateDistanceKm,
  calculateMercalliIntensity,
  getClosestGuatemalaDepartment,
} from '../src/utils/seismicCalculations';

const EMSC_BASE_URL = 'https://www.seismicportal.eu/fdsnws/event/1/query';

export async function fetchLatestGuatemalaEarthquakesFromEmsc(): Promise<Earthquake[]> {
  const starttime = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    format: 'json',
    minlat: '12.8',
    maxlat: '18.5',
    minlon: '-93.2',
    maxlon: '-87.2',
    minmag: '2.5',
    start: starttime.toISOString(),
    orderby: 'time',
    limit: '30',
  });

  const response = await fetch(`${EMSC_BASE_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`EMSC HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.features || !Array.isArray(data.features)) {
    throw new Error('Respuesta inválida de EMSC');
  }

  return data.features.map((item: any) => {
    const p = item.properties;
    const lat = p.lat;
    const lon = p.lon;
    const depth = Math.round((p.depth || 10) * 10) / 10;
    const mag = Math.round((p.mag || 3.0) * 10) / 10;
    const timeMs = new Date(p.time).getTime();

    const distToCapital = calculateDistanceKm(lat, lon, 14.6349, -90.5069);
    const closestDept = getClosestGuatemalaDepartment(lat, lon);
    const mmi = calculateMercalliIntensity(mag, depth, distToCapital);

    return {
      id: `emsc_${p.unid || item.id}`,
      magnitude: mag,
      place: p.flynn_region || 'Guatemala',
      time: timeMs,
      updated: new Date(p.lastupdate).getTime() || timeMs,
      depth,
      latitude: lat,
      longitude: lon,
      url: `https://www.seismicportal.eu/eventdetails.html?unid=${p.unid || item.id}`,
      status: 'reviewed',
      tsunami: 0,
      sig: Math.round(mag * 70),
      alert: mag >= 6.0 ? 'yellow' : mag >= 5.0 ? 'green' : null,
      department: closestDept.isWithinGuatemala ? closestDept.department : 'Fuera de Guatemala',
      intensityMercalli: `${mmi.roman} - ${mmi.level}`,
      distanceToGuatemalaCityKm: distToCapital,
    } satisfies Earthquake;
  });
}
