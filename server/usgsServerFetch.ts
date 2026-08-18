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
      department: closestDept.isWithinGuatemala ? closestDept.department : 'Fuera de Guatemala',
      intensityMercalli: `${mmi.roman} - ${mmi.level}`,
      distanceToGuatemalaCityKm: distToCapital,
    } satisfies Earthquake;
  });
}
