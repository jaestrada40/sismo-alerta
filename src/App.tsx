import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { AlertBanner } from './components/AlertBanner';
import { SeismicMap } from './components/SeismicMap';
import { AlertSimulator } from './components/AlertSimulator';
import { EarthquakeFeed } from './components/EarthquakeFeed';
import { BulletinGeneratorModal } from './components/BulletinGeneratorModal';
import { CommunityReports } from './components/CommunityReports';
import { EmergencyGuide } from './components/EmergencyGuide';
import { SeismicAiAdvisor } from './components/SeismicAiAdvisor';
import { fetchLiveGuatemalaEarthquakes, FALLBACK_GUATEMALA_EARTHQUAKES } from './services/usgsService';
import { Earthquake, SeismicSimulationConfig, SimulationResult, CommunityReport } from './types';
import { calculateSimulationResult } from './utils/seismicCalculations';
import { Map, Sliders, Users, ShieldCheck, Bot, Activity, AlertTriangle, Radio } from 'lucide-react';

export default function App() {
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>(FALLBACK_GUATEMALA_EARTHQUAKES);
  const [selectedEarthquake, setSelectedEarthquake] = useState<Earthquake | null>(null);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  const [minMagFilter, setMinMagFilter] = useState<number>(2.5);

  const [activeTab, setActiveTab] = useState<'map' | 'simulator' | 'community' | 'emergency' | 'ai'>('map');

  // User location (defaults to Ciudad de Guatemala)
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number; name: string }>({
    lat: 14.6349,
    lng: -90.5069,
    name: 'Ciudad de Guatemala (Capital)'
  });

  // Active Early Warning Alert State
  const [activeAlert, setActiveAlert] = useState<{
    config: SeismicSimulationConfig;
    result: SimulationResult;
    startedAt: number;
  } | null>(null);

  const [activeSimulationLocation, setActiveSimulationLocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  // Audio siren enabled
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Bulletin Modal State
  const [bulletinEarthquake, setBulletinEarthquake] = useState<Earthquake | null>(null);

  // Community reports state with default records
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([
    {
      id: 'cr_1',
      department: 'Escuintla',
      municipality: 'Puerto San José',
      feltIntensity: 'Fuerte',
      buildingType: 'Casa de 1 nivel',
      comments: 'Movimiento oscilatorio fuerte en la costa, se escuchó retumbo en el mar.',
      timestamp: Date.now() - 1000 * 60 * 25,
      mercalliEstimated: 'Mercalli VI'
    },
    {
      id: 'cr_2',
      department: 'Guatemala (Capital)',
      municipality: 'Zona 14',
      feltIntensity: 'Moderado',
      buildingType: 'Edificio de apartamentos / oficinas',
      comments: 'En piso 7 se sintió balanceo claro de lámparas durante unos 15 segundos.',
      timestamp: Date.now() - 1000 * 60 * 40,
      mercalliEstimated: 'Mercalli IV'
    },
    {
      id: 'cr_3',
      department: 'Sacatepéquez',
      municipality: 'Antigua Guatemala',
      feltIntensity: 'Leve',
      buildingType: 'Casa de 1 nivel',
      comments: 'Vibración suave de ventanas y copas de vidrio.',
      timestamp: Date.now() - 1000 * 60 * 75,
      mercalliEstimated: 'Mercalli III'
    }
  ]);

  // Fetch Live Earthquakes
  const loadEarthquakes = useCallback(async () => {
    setIsLoading(true);
    const res = await fetchLiveGuatemalaEarthquakes(timeframe, minMagFilter);
    setEarthquakes(res.earthquakes);
    setIsLive(res.isLive);
    setLastUpdated(Date.now());
    setIsLoading(false);
  }, [timeframe, minMagFilter]);

  useEffect(() => {
    loadEarthquakes();
    // Refresh interval every 45s
    const interval = setInterval(loadEarthquakes, 45000);
    return () => clearInterval(interval);
  }, [loadEarthquakes]);

  // Request browser geolocation once on mount if available
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            name: 'Ubicación Actual (GPS Detectado)'
          });
        },
        (err) => {
          console.log('GPS no concedido, usando Ciudad de Guatemala');
        },
        { timeout: 4000 }
      );
    }
  }, []);

  const handleTriggerAlert = (config: SeismicSimulationConfig, result: SimulationResult) => {
    setActiveAlert({
      config,
      result,
      startedAt: Date.now()
    });
    // Switch to map view to show wave propagation
    setActiveTab('map');
  };

  const handleSimulateEarthquake = (eq: Earthquake) => {
    const config: SeismicSimulationConfig = {
      epicenterName: eq.place,
      latitude: eq.latitude,
      longitude: eq.longitude,
      depth: eq.depth,
      magnitude: eq.magnitude,
      userLatitude: userCoords.lat,
      userLongitude: userCoords.lng,
      userLocationName: userCoords.name,
      pWaveSpeed: 6.0,
      sWaveSpeed: 3.5
    };
    const result = calculateSimulationResult(config);
    setActiveSimulationLocation({
      lat: eq.latitude,
      lng: eq.longitude,
      name: eq.place
    });
    setActiveAlert({
      config,
      result,
      startedAt: Date.now()
    });
    setActiveTab('map');
  };

  const handleAddCommunityReport = (rep: CommunityReport) => {
    setCommunityReports((prev) => [rep, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header Bar */}
      <Header
        isLive={isLive}
        lastUpdated={lastUpdated}
        onRefresh={loadEarthquakes}
        isLoading={isLoading}
        onOpenSimulation={() => setActiveTab('simulator')}
        onOpenEmergency={() => setActiveTab('emergency')}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
      />

      {/* Emergency Active Alert Banner */}
      <AlertBanner
        activeAlert={activeAlert}
        onDismiss={() => setActiveAlert(null)}
        audioEnabled={audioEnabled}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
        {/* System Status & Quick Actions Bar */}
        {!activeAlert && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 bg-green-600 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-green-950 text-sm sm:text-base">Estado del Sistema: Normal</h3>
                <p className="text-xs text-green-800 uppercase font-semibold">
                  Sin amenazas inmediatas detectadas • Sensores sísmicos en línea
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setActiveTab('simulator')}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-green-300 text-green-900 hover:bg-green-100 text-xs font-bold transition shadow-sm"
              >
                Simular Alarma
              </button>
              <button
                onClick={() => setActiveTab('emergency')}
                className="px-3.5 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-bold transition shadow-sm"
              >
                Plan Familiar 72h
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar pb-1 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <button
              id="nav-tab-map"
              onClick={() => setActiveTab('map')}
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition uppercase tracking-wider ${
                activeTab === 'map'
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Monitoreo en Tiempo Real</span>
            </button>

            <button
              id="nav-tab-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition uppercase tracking-wider ${
                activeTab === 'simulator'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Generador de Alertas</span>
            </button>

            <button
              id="nav-tab-community"
              onClick={() => setActiveTab('community')}
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition uppercase tracking-wider ${
                activeTab === 'community'
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>¿Lo Sentiste? ({communityReports.length})</span>
            </button>

            <button
              id="nav-tab-emergency"
              onClick={() => setActiveTab('emergency')}
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition uppercase tracking-wider ${
                activeTab === 'emergency'
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Mochila y CONRED</span>
            </button>

            <button
              id="nav-tab-ai"
              onClick={() => setActiveTab('ai')}
              className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition uppercase tracking-wider ${
                activeTab === 'ai'
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Asesor IA</span>
            </button>
          </div>
        </div>

        {/* Dynamic Views */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Map Column */}
            <div className="lg:col-span-7 space-y-4">
              <SeismicMap
                earthquakes={earthquakes}
                selectedEarthquake={selectedEarthquake}
                onSelectEarthquake={(eq) => setSelectedEarthquake(eq)}
                activeSimulationLocation={activeSimulationLocation}
                userLocation={userCoords}
                onOpenBulletinModal={(eq) => setBulletinEarthquake(eq)}
              />

              {/* Summary Metric Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Total Sismos</span>
                  <span className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{earthquakes.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Sismo Mayor Reciente</span>
                  <span className="text-xl font-black text-red-600 font-mono mt-0.5 block">
                    M {Math.max(...earthquakes.map((e) => e.magnitude), 3.0).toFixed(1)}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Zona Tectónica</span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block truncate">Falla Motagua & Cocos</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Red Sísmica</span>
                  <span className="text-xs font-bold text-green-700 mt-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    En Línea / Activa
                  </span>
                </div>
              </div>

              {/* Emergency Quick Action Cards */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                <h3 className="font-bold text-xs uppercase text-slate-500 tracking-wider mb-3">
                  Acciones Rápidas de Emergencia
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveTab('emergency')}
                    className="flex flex-col items-center justify-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="w-9 h-9 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase">Protocolos</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('simulator')}
                    className="flex flex-col items-center justify-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                  >
                    <div className="w-9 h-9 bg-red-100 text-red-700 rounded-full flex items-center justify-center">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase">Simulador</span>
                  </button>

                  <a
                    href="tel:119"
                    className="flex flex-col items-center justify-center gap-2 p-3 border border-red-200 bg-red-50/50 rounded-lg hover:bg-red-100/60 transition text-center"
                  >
                    <div className="w-9 h-9 bg-red-600 text-white rounded-full flex items-center justify-center">
                      <Activity className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-black text-red-700 uppercase">SOS CONRED (119)</span>
                  </a>

                  <a
                    href="tel:122"
                    className="flex flex-col items-center justify-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-center"
                  >
                    <div className="w-9 h-9 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center">
                      <Radio className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 uppercase">Bomberos (122)</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Earthquakes Feed Column */}
            <div className="lg:col-span-5">
              <EarthquakeFeed
                earthquakes={earthquakes}
                selectedEarthquake={selectedEarthquake}
                onSelectEarthquake={(eq) => setSelectedEarthquake(eq)}
                onOpenBulletinModal={(eq) => setBulletinEarthquake(eq)}
                onSimulateEarthquake={handleSimulateEarthquake}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                minMagFilter={minMagFilter}
                setMinMagFilter={setMinMagFilter}
              />
            </div>
          </div>
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <AlertSimulator
              onTriggerAlert={handleTriggerAlert}
              onSelectSimulationLocation={(loc) => setActiveSimulationLocation(loc)}
              userCoords={userCoords}
              setUserCoords={setUserCoords}
            />
          </div>
        )}

        {activeTab === 'community' && (
          <div>
            <CommunityReports
              reports={communityReports}
              onAddReport={handleAddCommunityReport}
            />
          </div>
        )}

        {activeTab === 'emergency' && (
          <div>
            <EmergencyGuide />
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="max-w-4xl mx-auto">
            <SeismicAiAdvisor
              lastEarthquakePlace={earthquakes[0]?.place}
            />
          </div>
        )}
      </main>

      {/* Official INSIVUMEH Bulletin Modal */}
      <BulletinGeneratorModal
        earthquake={bulletinEarthquake}
        onClose={() => setBulletinEarthquake(null)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="text-white font-bold tracking-wide">
              CONRED • INSIVUMEH • SISTEMA NACIONAL DE ALERTA TEMPRANA
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Monitoreo y alerta sísmica en la República de Guatemala. Basado en sensores USGS e INSIVUMEH.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <span className="text-amber-400">Emergencias: 119 CONRED</span>
            <span>•</span>
            <span className="text-red-400">122 / 123 Bomberos</span>
            <span>•</span>
            <span className="text-slate-400">v2.4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
