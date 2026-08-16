export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  updated: number;
  depth: number;
  latitude: number;
  longitude: number;
  url: string;
  status: string;
  tsunami: number;
  sig: number;
  felt?: number;
  alert?: 'green' | 'yellow' | 'orange' | 'red' | null;
  department?: string;
  intensityMercalli?: string;
  distanceToGuatemalaCityKm?: number;
}

export interface SeismicFault {
  name: string;
  type: string;
  description: string;
  coordinates: [number, number][]; // [lat, lng]
  color: string;
  riskLevel: 'Muy Alto' | 'Alto' | 'Moderado';
}

export interface GuatemalaDepartment {
  name: string;
  lat: number;
  lng: number;
  capital: string;
  riskZone: 'Zona 4 (Riesgo Muy Alto)' | 'Zona 3 (Riesgo Alto)' | 'Zona 2 (Riesgo Medio)' | 'Zona 1 (Riesgo Bajo)';
}

export interface SeismicSimulationConfig {
  epicenterName: string;
  latitude: number;
  longitude: number;
  depth: number; // km
  magnitude: number;
  userLatitude: number;
  userLongitude: number;
  userLocationName: string;
  pWaveSpeed: number; // km/s (default 6.0)
  sWaveSpeed: number; // km/s (default 3.5)
}

export interface SimulationResult {
  epicentralDistanceKm: number;
  hypocentralDistanceKm: number;
  pWaveArrivalSec: number;
  sWaveArrivalSec: number;
  warningTimeSec: number; // sWave - pWave detection
  estimatedMercalliIntensity: {
    roman: string;
    level: string;
    description: string;
    color: string;
  };
  peakGroundAccelerationG: number; // estimated PGA in %g
  alertLevel: 'INFORMATIVO' | 'LEVE' | 'MODERADO' | 'FUERTE' | 'SEVERO' | 'CRÍTICO';
}

export interface CommunityReport {
  id: string;
  earthquakeId?: string;
  department: string;
  municipality: string;
  feltIntensity: 'No sentido' | 'Débil' | 'Leve' | 'Moderado' | 'Fuerte' | 'Muy Fuerte / Pánico';
  buildingType: 'Casa de 1 nivel' | 'Edificio de apartamentos / oficinas' | 'Construcción de adobe / bajareque' | 'Vehículo' | 'Exterior';
  comments?: string;
  timestamp: number;
  mercalliEstimated: string;
}

export interface EmergencyContact {
  institution: string;
  acronym: string;
  number: string;
  description: string;
  iconName: string;
  color: string;
}

export interface BackpackItem {
  id: string;
  category: 'Agua y Alimentos' | 'Primeros Auxilios' | 'Herramientas y Comunicación' | 'Documentos y Valores' | 'Higiene y Ropa';
  name: string;
  description: string;
  checked: boolean;
  important: boolean;
}
