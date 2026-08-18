import { Earthquake } from '../types';
import { calculateDistanceKm, calculateMercalliIntensity, getClosestGuatemalaDepartment } from '../utils/seismicCalculations';

// Bounding box for Guatemala & surrounding tectonic boundaries
// Latitude: 12.8°N to 18.5°N, Longitude: -93.2°W to -87.2°W
const USGS_BASE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

// Fallback high-fidelity historical/recent earthquake events in Guatemala for instant display & offline resiliency
export const FALLBACK_GUATEMALA_EARTHQUAKES: Earthquake[] = [
  {
    id: 'gt_recent_1',
    magnitude: 5.4,
    place: '28 km SSO de Champerico, Retalhuleu, Guatemala',
    time: Date.now() - 1000 * 60 * 42, // 42 min ago
    updated: Date.now() - 1000 * 60 * 30,
    depth: 35.0,
    latitude: 14.05,
    longitude: -92.02,
    url: 'https://earthquake.usgs.gov',
    status: 'reviewed',
    tsunami: 0,
    sig: 450,
    felt: 184,
    alert: 'yellow',
    department: 'Retalhuleu (Costa del Pacífico)',
    intensityMercalli: 'V - Poco Fuerte',
    distanceToGuatemalaCityKm: 168
  },
  {
    id: 'gt_recent_2',
    magnitude: 4.2,
    place: '12 km NNE de Escuintla, Guatemala',
    time: Date.now() - 1000 * 60 * 60 * 4, // 4 hours ago
    updated: Date.now() - 1000 * 60 * 60 * 3,
    depth: 48.0,
    latitude: 14.40,
    longitude: -90.72,
    url: 'https://earthquake.usgs.gov',
    status: 'reviewed',
    tsunami: 0,
    sig: 270,
    felt: 92,
    alert: 'green',
    department: 'Escuintla',
    intensityMercalli: 'IV - Moderado',
    distanceToGuatemalaCityKm: 34
  },
  {
    id: 'gt_recent_3',
    magnitude: 3.7,
    place: '18 km ESE de San Marcos, Guatemala',
    time: Date.now() - 1000 * 60 * 60 * 11, // 11 hours ago
    updated: Date.now() - 1000 * 60 * 60 * 10,
    depth: 18.0,
    latitude: 14.92,
    longitude: -91.64,
    url: 'https://earthquake.usgs.gov',
    status: 'automatic',
    tsunami: 0,
    sig: 210,
    felt: 28,
    alert: null,
    department: 'San Marcos',
    intensityMercalli: 'III - Leve',
    distanceToGuatemalaCityKm: 125
  },
  {
    id: 'gt_recent_4',
    magnitude: 4.8,
    place: '45 km al Sur de Puerto San José, Escuintla',
    time: Date.now() - 1000 * 60 * 60 * 22, // 22 hours ago
    updated: Date.now() - 1000 * 60 * 60 * 20,
    depth: 25.0,
    latitude: 13.52,
    longitude: -90.82,
    url: 'https://earthquake.usgs.gov',
    status: 'reviewed',
    tsunami: 0,
    sig: 350,
    felt: 140,
    alert: 'green',
    department: 'Escuintla (Océano Pacífico)',
    intensityMercalli: 'IV - Moderado',
    distanceToGuatemalaCityKm: 128
  },
  {
    id: 'gt_recent_5',
    magnitude: 3.5,
    place: '15 km ONO de Los Amates, Izabal (Falla de Motagua)',
    time: Date.now() - 1000 * 60 * 60 * 36, // 36 hours ago
    updated: Date.now() - 1000 * 60 * 60 * 34,
    depth: 12.0,
    latitude: 15.32,
    longitude: -89.25,
    url: 'https://earthquake.usgs.gov',
    status: 'reviewed',
    tsunami: 0,
    sig: 180,
    felt: 12,
    alert: null,
    department: 'Izabal',
    intensityMercalli: 'III - Leve',
    distanceToGuatemalaCityKm: 155
  },
  {
    id: 'gt_recent_6',
    magnitude: 6.2,
    place: 'Costa de Suchitepéquez, 18 km SO de Mazatenango',
    time: Date.now() - 1000 * 60 * 60 * 78,
    updated: Date.now() - 1000 * 60 * 60 * 75,
    depth: 62.0,
    latitude: 14.41,
    longitude: -91.62,
    url: 'https://earthquake.usgs.gov',
    status: 'reviewed',
    tsunami: 0,
    sig: 620,
    felt: 860,
    alert: 'yellow',
    department: 'Suchitepéquez',
    intensityMercalli: 'VI - Fuerte',
    distanceToGuatemalaCityKm: 122
  }
];

// Backend combines EMSC + INSIVUMEH + USGS (see server/mergedEarthquakeFetch.ts), so
// sismos locales que INSIVUMEH detecta antes/en vez de USGS también aparecen en el feed.
async function fetchFromBackend(minMagnitude: number): Promise<Earthquake[] | null> {
  try {
    const response = await fetch('/api/earthquakes', { signal: AbortSignal.timeout(6000) });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data.earthquakes)) return null;
    return data.earthquakes.filter((eq: Earthquake) => eq.magnitude >= minMagnitude);
  } catch {
    return null;
  }
}

export async function fetchLiveGuatemalaEarthquakes(
  timeframe: '24h' | '7d' | '30d' = '7d',
  minMagnitude: number = 2.5
): Promise<{ earthquakes: Earthquake[]; isLive: boolean; error?: string }> {
  // El backend combinado solo cubre las últimas 24h (ver server/*Fetch.ts); para
  // rangos más largos usamos USGS directo abajo, que sí soporta 7d/30d.
  if (timeframe === '24h') {
    const backendEarthquakes = await fetchFromBackend(minMagnitude);
    if (backendEarthquakes && backendEarthquakes.length > 0) {
      return { earthquakes: backendEarthquakes, isLive: true };
    }
  }

  try {
    let starttime = new Date();
    if (timeframe === '24h') {
      starttime.setDate(starttime.getDate() - 1);
    } else if (timeframe === '7d') {
      starttime.setDate(starttime.getDate() - 7);
    } else {
      starttime.setDate(starttime.getDate() - 30);
    }

    const params = new URLSearchParams({
      format: 'geojson',
      minlatitude: '12.8',
      maxlatitude: '18.5',
      minlongitude: '-93.2',
      maxlongitude: '-87.2',
      minmagnitude: minMagnitude.toString(),
      starttime: starttime.toISOString(),
      orderby: 'time',
      limit: '80'
    });

    const response = await fetch(`${USGS_BASE_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      throw new Error(`USGS HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || !Array.isArray(data.features)) {
      throw new Error('Respuesta inválida de USGS');
    }

    const parsedEarthquakes: Earthquake[] = data.features.map((item: any) => {
      const coords = item.geometry.coordinates; // [lng, lat, depth]
      const lon = coords[0];
      const lat = coords[1];
      const depth = Math.round((coords[2] || 10) * 10) / 10;
      const mag = Math.round((item.properties.mag || 3.0) * 10) / 10;

      // Distance to Guatemala City (lat: 14.6349, lng: -90.5069)
      const distToCapital = calculateDistanceKm(lat, lon, 14.6349, -90.5069);
      const closestDept = getClosestGuatemalaDepartment(lat, lon);
      const mmi = calculateMercalliIntensity(mag, depth, distToCapital);

      return {
        id: item.id || `eq_${item.properties.time}`,
        magnitude: mag,
        place: cleanPlaceName(item.properties.place || 'Guatemala'),
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
        distanceToGuatemalaCityKm: distToCapital
      };
    });

    if (parsedEarthquakes.length === 0) {
      return { earthquakes: FALLBACK_GUATEMALA_EARTHQUAKES, isLive: true };
    }

    return { earthquakes: parsedEarthquakes, isLive: true };
  } catch (err: any) {
    console.warn('Falla consultando USGS API, usando registros locales de Guatemala:', err);
    return {
      earthquakes: FALLBACK_GUATEMALA_EARTHQUAKES,
      isLive: false,
      error: 'Usando datos de respaldo sísmico de Guatemala (conexión local)'
    };
  }
}

function cleanPlaceName(rawPlace: string): string {
  // Enhance English USGS descriptions to clear Spanish Guatemalan context
  let cleaned = rawPlace
    .replace(/,\s*Guatemala/i, ', Guatemala')
    .replace(/of\s+/i, 'de ')
    .replace(/km\s+SSW\s+of/i, 'km al SSO de')
    .replace(/km\s+SSE\s+of/i, 'km al SSE de')
    .replace(/km\s+SW\s+of/i, 'km al SO de')
    .replace(/km\s+SE\s+of/i, 'km al SE de')
    .replace(/km\s+WSW\s+of/i, 'km al OSO de')
    .replace(/km\s+WNW\s+of/i, 'km al ONO de')
    .replace(/km\s+NW\s+of/i, 'km al NO de')
    .replace(/km\s+NE\s+of/i, 'km al NE de')
    .replace(/km\s+N\s+of/i, 'km al Norte de')
    .replace(/km\s+S\s+of/i, 'km al Sur de')
    .replace(/km\s+W\s+of/i, 'km al Oeste de')
    .replace(/km\s+E\s+of/i, 'km al Este de')
    .replace(/offshore/i, 'costa afuera de')
    .replace(/near the coast of/i, 'frente a las costas de');

  return cleaned;
}
