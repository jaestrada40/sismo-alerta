import { GUATEMALA_DEPARTMENTS } from '../data/guatemalaData';
import { SimulationResult, SeismicSimulationConfig } from '../types';

/**
 * Calculates Haversine distance in km between two coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Finds the closest Guatemala department to a given coordinate
 */
export function getClosestGuatemalaDepartment(lat: number, lng: number): {
  department: string;
  distanceKm: number;
} {
  let closestDept = GUATEMALA_DEPARTMENTS[0].name;
  let minDistance = Infinity;

  for (const dept of GUATEMALA_DEPARTMENTS) {
    const dist = calculateDistanceKm(lat, lng, dept.lat, dept.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestDept = dept.name;
    }
  }

  return {
    department: closestDept,
    distanceKm: Math.round(minDistance)
  };
}

/**
 * Estimates Modified Mercalli Intensity based on magnitude, depth and distance
 */
export function calculateMercalliIntensity(
  magnitude: number,
  depthKm: number,
  epicentralDistanceKm: number
): {
  roman: string;
  level: string;
  description: string;
  color: string;
  numericValue: number;
} {
  const hypocentralDistance = Math.sqrt(
    epicentralDistanceKm * epicentralDistanceKm + depthKm * depthKm
  );
  
  // Empirical estimation formula adapted for Central American subduction and crustal events
  // MMI ~ 1.5*M - 3.25 * log10(max(hypocentralDistance, 10)) + 3.0
  let rawIntensity =
    1.5 * magnitude -
    3.25 * Math.log10(Math.max(hypocentralDistance, 10)) +
    2.8;

  // Clamp raw intensity between 1 and 10
  rawIntensity = Math.max(1, Math.min(10, rawIntensity));
  const roundedIntensity = Math.round(rawIntensity);

  switch (roundedIntensity) {
    case 1:
      return {
        roman: 'I',
        level: 'No Sentido',
        description: 'Imperceptible excepto por instrumentos sismológicos muy sensibles.',
        color: '#94a3b8',
        numericValue: 1
      };
    case 2:
      return {
        roman: 'II',
        level: 'Débil',
        description: 'Sentido solo por personas en reposo o en pisos superiores de edificios.',
        color: '#38bdf8',
        numericValue: 2
      };
    case 3:
      return {
        roman: 'III',
        level: 'Leve',
        description: 'Sentido en interiores. Similar a la vibración del paso de un camión liviano.',
        color: '#22c55e',
        numericValue: 3
      };
    case 4:
      return {
        roman: 'IV',
        level: 'Moderado',
        description: 'Sentido por muchas personas. Objetos colgantes oscilan, vajillas vibran.',
        color: '#eab308',
        numericValue: 4
      };
    case 5:
      return {
        roman: 'V',
        level: 'Poco Fuerte',
        description: 'Sentido por casi todos. Despierta a dormidos. Puertas se mueven.',
        color: '#f97316',
        numericValue: 5
      };
    case 6:
      return {
        roman: 'VI',
        level: 'Fuerte',
        description: 'Sentido por todos. Temor general. Caída de objetos, grietas leves en repello.',
        color: '#ef4444',
        numericValue: 6
      };
    case 7:
      return {
        roman: 'VII',
        level: 'Muy Fuerte',
        description: 'Daños considerables en construcciones de adobe o bajareque. Difícil mantenerse de pie.',
        color: '#dc2626',
        numericValue: 7
      };
    case 8:
      return {
        roman: 'VIII',
        level: 'Destructivo',
        description: 'Daño severo en estructuras vulnerables, colapso parcial de muros y chimeneas.',
        color: '#991b1b',
        numericValue: 8
      };
    case 9:
      return {
        roman: 'IX',
        level: 'Ruinoso',
        description: 'Pánico generalizado. Daños severos y colapsos estructurales en edificios no sismorresistentes.',
        color: '#7f1d1d',
        numericValue: 9
      };
    default:
      return {
        roman: 'X+',
        level: 'Desastroso',
        description: 'Destrucción masiva de estructuras, grietas en el suelo y deslizamientos de tierra.',
        color: '#450a0a',
        numericValue: 10
      };
  }
}

/**
 * Calculates complete simulation result
 */
export function calculateSimulationResult(
  config: SeismicSimulationConfig
): SimulationResult {
  const epicentralDistanceKm = calculateDistanceKm(
    config.latitude,
    config.longitude,
    config.userLatitude,
    config.userLongitude
  );

  const hypocentralDistanceKm = Math.round(
    Math.sqrt(
      epicentralDistanceKm * epicentralDistanceKm +
        config.depth * config.depth
    ) * 10
  ) / 10;

  const pSpeed = config.pWaveSpeed || 6.0;
  const sSpeed = config.sWaveSpeed || 3.5;

  const pWaveArrivalSec = Math.round((hypocentralDistanceKm / pSpeed) * 10) / 10;
  const sWaveArrivalSec = Math.round((hypocentralDistanceKm / sSpeed) * 10) / 10;

  // Processing & telemetry detection latency (around 3.5 to 5.0 seconds from initial P wave detection at closest station)
  const systemLatencySec = Math.min(4.0, pWaveArrivalSec * 0.4);
  const warningTimeSec = Math.max(
    0,
    Math.round((sWaveArrivalSec - (pWaveArrivalSec + systemLatencySec)) * 10) / 10
  );

  const estimatedMercalliIntensity = calculateMercalliIntensity(
    config.magnitude,
    config.depth,
    epicentralDistanceKm
  );

  // Peak Ground Acceleration (PGA) estimate in %g
  // PGA ~ 10^(0.24 * MMI - 1.66) / 9.8
  const pgaEstimated = Math.min(
    120,
    Math.round(Math.pow(10, 0.26 * estimatedMercalliIntensity.numericValue - 1.4) * 10) / 10
  );

  let alertLevel: SimulationResult['alertLevel'] = 'INFORMATIVO';
  if (config.magnitude >= 7.0 || estimatedMercalliIntensity.numericValue >= 8) {
    alertLevel = 'CRÍTICO';
  } else if (config.magnitude >= 6.0 || estimatedMercalliIntensity.numericValue >= 6) {
    alertLevel = 'SEVERO';
  } else if (config.magnitude >= 5.2 || estimatedMercalliIntensity.numericValue >= 5) {
    alertLevel = 'FUERTE';
  } else if (config.magnitude >= 4.5 || estimatedMercalliIntensity.numericValue >= 4) {
    alertLevel = 'MODERADO';
  } else if (config.magnitude >= 3.8) {
    alertLevel = 'LEVE';
  }

  return {
    epicentralDistanceKm,
    hypocentralDistanceKm,
    pWaveArrivalSec,
    sWaveArrivalSec,
    warningTimeSec,
    estimatedMercalliIntensity,
    peakGroundAccelerationG: pgaEstimated,
    alertLevel
  };
}

/**
 * Formats date and time to Guatemala standard (UTC-6)
 */
export function formatGuatemalaTime(timestamp: number): string {
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date(timestamp));
}

export function formatShortGuatemalaTime(timestamp: number): string {
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'America/Guatemala',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(timestamp));
}

/**
 * Returns human readable relative time in Spanish
 */
export function getRelativeTimeSpanish(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return `Hace ${diffSec} seg`;
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  return `Hace ${diffDays} d`;
}
