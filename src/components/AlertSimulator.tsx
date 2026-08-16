import React, { useState } from 'react';
import { SeismicSimulationConfig, SimulationResult, GuatemalaDepartment } from '../types';
import { GUATEMALA_DEPARTMENTS } from '../data/guatemalaData';
import { calculateSimulationResult } from '../utils/seismicCalculations';
import { Play, Sparkles, Sliders, ShieldAlert, Zap, MapPin, Gauge, Radio, Volume2 } from 'lucide-react';

interface AlertSimulatorProps {
  onTriggerAlert: (config: SeismicSimulationConfig, result: SimulationResult) => void;
  onSelectSimulationLocation: (loc: { lat: number; lng: number; name: string } | null) => void;
  userCoords: { lat: number; lng: number; name: string };
  setUserCoords: (coords: { lat: number; lng: number; name: string }) => void;
}

const PRESET_SCENARIOS = [
  {
    title: 'Simulacro CONRED: Sismo M6.8 Costa del Pacífico',
    description: 'Sismo subducción frente a Retalhuleu/Escuintla. Da tiempo de alerta de ~25-35s a la capital.',
    dept: 'Retalhuleu',
    lat: 14.15,
    lng: -91.85,
    magnitude: 6.8,
    depth: 32
  },
  {
    title: 'Gran Terremoto Falla de Motagua M7.5 (Escenario 1976)',
    description: 'Ruptura superficial a lo largo del valle de Motagua (Izabal/Zacapa/Chimaltenango).',
    dept: 'Zacapa',
    lat: 15.05,
    lng: -89.85,
    magnitude: 7.5,
    depth: 10
  },
  {
    title: 'Sismo Fuerte San Marcos / Costa Suroccidental M7.2',
    description: 'Evento de subducción profunda en la frontera suroccidental.',
    dept: 'San Marcos',
    lat: 14.75,
    lng: -92.10,
    magnitude: 7.2,
    depth: 45
  },
  {
    title: 'Sismo Superficial Falla de Jalpatagua M5.5',
    description: 'Sismo local en Santa Rosa/Jutiapa con fuerte aceleración cercana.',
    dept: 'Santa Rosa',
    lat: 14.28,
    lng: -90.25,
    magnitude: 5.5,
    depth: 8
  }
];

export const AlertSimulator: React.FC<AlertSimulatorProps> = ({
  onTriggerAlert,
  onSelectSimulationLocation,
  userCoords,
  setUserCoords
}) => {
  const [selectedDeptName, setSelectedDeptName] = useState<string>('Escuintla');
  const [customLat, setCustomLat] = useState<number>(14.30);
  const [customLng, setCustomLng] = useState<number>(-90.78);
  const [magnitude, setMagnitude] = useState<number>(6.5);
  const [depth, setDepth] = useState<number>(25);

  const selectedDepartment = GUATEMALA_DEPARTMENTS.find(d => d.name.includes(selectedDeptName)) || GUATEMALA_DEPARTMENTS[3];

  const handleDepartmentChange = (deptName: string) => {
    setSelectedDeptName(deptName);
    const dept = GUATEMALA_DEPARTMENTS.find(d => d.name === deptName);
    if (dept) {
      setCustomLat(dept.lat);
      setCustomLng(dept.lng);
    }
  };

  const applyPreset = (preset: typeof PRESET_SCENARIOS[0]) => {
    setSelectedDeptName(preset.dept);
    setCustomLat(preset.lat);
    setCustomLng(preset.lng);
    setMagnitude(preset.magnitude);
    setDepth(preset.depth);
  };

  // Build current simulation config & preview
  const currentConfig: SeismicSimulationConfig = {
    epicenterName: `${selectedDeptName} (Lat ${customLat.toFixed(2)}°, Lon ${customLng.toFixed(2)}°)`,
    latitude: customLat,
    longitude: customLng,
    depth,
    magnitude,
    userLatitude: userCoords.lat,
    userLongitude: userCoords.lng,
    userLocationName: userCoords.name,
    pWaveSpeed: 6.0,
    sWaveSpeed: 3.5
  };

  const simulationPreview = calculateSimulationResult(currentConfig);

  const handleTrigger = () => {
    onSelectSimulationLocation({
      lat: customLat,
      lng: customLng,
      name: selectedDeptName
    });
    onTriggerAlert(currentConfig, simulationPreview);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              Generador de Alertas Sísmicas <span className="text-blue-900 text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200 font-bold">Simulador</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configura parámetros geofísicos, calcula tiempos de propagación de onda P y S, y emite una alerta temprana en tiempo real.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Scenarios */}
      <div className="mt-5">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
          Escenarios de Referencia y Simulacros Nacionales
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_SCENARIOS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(preset)}
              className="text-left p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-900/50 hover:bg-slate-100 transition group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-red-600 font-mono">
                  M {preset.magnitude.toFixed(1)}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">{preset.depth} km prof.</span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-1 group-hover:text-blue-900">{preset.title}</p>
              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Sliders & Inputs */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        {/* Department Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            Departamento Epicentral:
          </label>
          <select
            value={selectedDeptName}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-900 focus:outline-none shadow-sm"
          >
            {GUATEMALA_DEPARTMENTS.map((dept) => (
              <option key={dept.name} value={dept.name}>
                {dept.name} ({dept.capital})
              </option>
            ))}
          </select>
        </div>

        {/* Magnitude Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-yellow-600" />
              Magnitud (Mw):
            </label>
            <span className="text-sm font-black text-red-600 font-mono">{magnitude.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="3.0"
            max="8.2"
            step="0.1"
            value={magnitude}
            onChange={(e) => setMagnitude(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
            <span>3.0 Leve</span>
            <span>5.5 Fuerte</span>
            <span>8.0+ Terremoto</span>
          </div>
        </div>

        {/* Depth Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-blue-600" />
              Profundidad Focal:
            </label>
            <span className="text-xs font-bold text-blue-900 font-mono">{depth} km</span>
          </div>
          <input
            type="range"
            min="5"
            max="180"
            step="5"
            value={depth}
            onChange={(e) => setDepth(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-900"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-semibold mt-1">
            <span>5km Superficial</span>
            <span>60km Intermedio</span>
            <span>180km Profundo</span>
          </div>
        </div>

        {/* User Location Selector */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-blue-900" />
            Tu Ubicación de Recepción:
          </label>
          <select
            value={userCoords.name}
            onChange={(e) => {
              const selected = GUATEMALA_DEPARTMENTS.find(d => d.capital.includes(e.target.value) || d.name.includes(e.target.value));
              if (selected) {
                setUserCoords({ lat: selected.lat, lng: selected.lng, name: selected.capital });
              }
            }}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-900 focus:outline-none shadow-sm"
          >
            <option value="Ciudad de Guatemala">Ciudad de Guatemala (Capital)</option>
            <option value="Antigua Guatemala">Antigua Guatemala (Sacatepéquez)</option>
            <option value="Quetzaltenango (Xela)">Quetzaltenango (Xela)</option>
            <option value="Escuintla">Escuintla</option>
            <option value="Cobán">Cobán (Alta Verapaz)</option>
            <option value="Puerto Barrios">Puerto Barrios (Izabal)</option>
            <option value="San Marcos">San Marcos</option>
            <option value="Huehuetenango">Huehuetenango</option>
          </select>
        </div>
      </div>

      {/* Physics & Calculation Result Preview */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block">Distancia Epicentral</span>
          <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
            {simulationPreview.epicentralDistanceKm} km
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Hipocentro: {simulationPreview.hypocentralDistanceKm} km</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block">Arribo Onda S (Daño)</span>
          <span className="text-xl font-black text-yellow-600 font-mono mt-0.5 block">
            {simulationPreview.sWaveArrivalSec} s
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Onda P: {simulationPreview.pWaveArrivalSec} s</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block">Tiempo de Alerta</span>
          <span className="text-xl font-black text-green-700 font-mono mt-0.5 block">
            {simulationPreview.warningTimeSec} s
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Para evacuar / protegerse</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider block">Intensidad Mercalli</span>
          <span
            className="text-xl font-black mt-0.5 block"
            style={{ color: simulationPreview.estimatedMercalliIntensity.color }}
          >
            Grado {simulationPreview.estimatedMercalliIntensity.roman}
          </span>
          <span className="text-[10px] text-slate-600 font-bold truncate block">
            {simulationPreview.estimatedMercalliIntensity.level}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-blue-900" />
          <span>La alerta emitirá sirena acústica con sintetizador de voz y cronómetro de impacto.</span>
        </div>

        <button
          id="btn-trigger-simulation-alert"
          onClick={handleTrigger}
          className="w-full sm:w-auto px-6 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Emitir Alerta Sísmica Temprana</span>
        </button>
      </div>
    </div>
  );
};
