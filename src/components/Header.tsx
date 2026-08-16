import React, { useEffect, useState } from 'react';
import { Activity, Bell, Volume2, VolumeX, ShieldAlert, Radio, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatShortGuatemalaTime } from '../utils/seismicCalculations';
import { seismicAudio } from '../utils/seismicAudio';

interface HeaderProps {
  isLive: boolean;
  lastUpdated: number;
  onRefresh: () => void;
  isLoading: boolean;
  onOpenSimulation: () => void;
  onOpenEmergency: () => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isLive,
  lastUpdated,
  onRefresh,
  isLoading,
  onOpenSimulation,
  onOpenEmergency,
  audioEnabled,
  setAudioEnabled
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Intl.DateTimeFormat('es-GT', {
          timeZone: 'America/Guatemala',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(new Date()) + ' CST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    if (next) {
      seismicAudio.playSeismicBeep(660, 150);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-blue-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 sm:h-20 py-2 sm:py-0 gap-2">
          {/* Logo & National System Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <img
              src="/assets/icon-64.png"
              alt="Sismo GT"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg shadow-md flex-shrink-0 bg-white/90 p-1"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5 uppercase whitespace-nowrap">
                  SISMO ALERT <span className="font-light opacity-90 text-blue-200">GUATEMALA</span>
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-800 text-blue-200 border border-blue-700">
                  USGS
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-blue-200">
                <span className="flex items-center gap-1.5 font-medium whitespace-nowrap">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse inline-block flex-shrink-0"></span>
                  <span className="uppercase text-[10px] sm:text-[11px] font-bold tracking-wide">
                    {isLive ? 'SISTEMA ACTIVO' : 'MODO SEGURO'}
                  </span>
                </span>
                <span className="hidden sm:inline opacity-60">•</span>
                <span className="hidden sm:inline text-[11px] opacity-90">Red Nacional de Monitoreo</span>
              </div>
            </div>
          </div>

          {/* Right Side: Status, Time, Quick Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-4 flex-shrink-0">
            {/* Clock */}
            <div className="hidden md:block text-xs font-mono text-blue-100 font-semibold border-l border-white/20 pl-4 py-1">
              {currentTime}
            </div>

            {/* Audio alarm toggle button */}
            <button
              id="btn-toggle-audio"
              onClick={toggleSound}
              title={audioEnabled ? 'Sonido de alerta sísmica activado' : 'Sonido desactivado'}
              className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
                audioEnabled
                  ? 'bg-blue-800/80 border-blue-600 text-amber-300 hover:bg-blue-800'
                  : 'bg-blue-950/60 border-blue-800 text-blue-300 hover:bg-blue-900'
              }`}
            >
              {audioEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span className="hidden lg:inline">Sirena Activa</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-blue-300" />
                  <span className="hidden lg:inline">Silenciado</span>
                </>
              )}
            </button>

            {/* Refresh feed */}
            <button
              id="btn-refresh-feed"
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg bg-blue-800 border border-blue-700 text-white hover:bg-blue-700 transition disabled:opacity-50"
              title="Actualizar datos de sismos"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-300' : ''}`} />
            </button>

            {/* Simulator Trigger */}
            <button
              id="btn-open-simulator"
              onClick={onOpenSimulation}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition active:scale-95 uppercase tracking-wide"
            >
              <AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">Probar Alerta</span>
              <span className="sm:hidden">Alerta</span>
            </button>

            {/* Emergency Hotline Quick Access */}
            <button
              id="btn-open-emergency"
              onClick={onOpenEmergency}
              className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition"
            >
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <span className="hidden lg:inline">119 CONRED</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
