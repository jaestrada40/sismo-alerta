import React, { useState } from 'react';
import { Earthquake } from '../types';
import { formatGuatemalaTime, getRelativeTimeSpanish } from '../utils/seismicCalculations';
import { Activity, MapPin, Gauge, Clock, FileText, Search, Play, AlertCircle, Share2 } from 'lucide-react';

interface EarthquakeFeedProps {
  earthquakes: Earthquake[];
  selectedEarthquake: Earthquake | null;
  onSelectEarthquake: (eq: Earthquake) => void;
  onOpenBulletinModal: (eq: Earthquake) => void;
  onSimulateEarthquake: (eq: Earthquake) => void;
  timeframe: '24h' | '7d' | '30d';
  setTimeframe: (tf: '24h' | '7d' | '30d') => void;
  minMagFilter: number;
  setMinMagFilter: (val: number) => void;
}

export const EarthquakeFeed: React.FC<EarthquakeFeedProps> = ({
  earthquakes,
  selectedEarthquake,
  onSelectEarthquake,
  onOpenBulletinModal,
  onSimulateEarthquake,
  timeframe,
  setTimeframe,
  minMagFilter,
  setMinMagFilter
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredEarthquakes = earthquakes.filter((eq) => {
    const matchesMag = eq.magnitude >= minMagFilter;
    const matchesSearch =
      searchTerm.trim() === '' ||
      eq.place.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.department && eq.department.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesMag && matchesSearch;
  });

  const getMagnitudeColorClass = (mag: number) => {
    if (mag >= 5.0) return 'text-red-600';
    if (mag >= 4.0) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const getMagnitudeLevelText = (mag: number) => {
    if (mag >= 6.5) return 'SEVERO';
    if (mag >= 5.0) return 'FUERTE';
    if (mag >= 4.0) return 'MODERADO';
    return 'LEVE';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-full">
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-900" />
            Últimos Eventos (USGS)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {filteredEarthquakes.length} sismos registrados en territorio guatemalteco
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center bg-slate-200/70 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            id="filter-24h"
            onClick={() => setTimeframe('24h')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition ${
              timeframe === '24h'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            24h
          </button>
          <button
            id="filter-7d"
            onClick={() => setTimeframe('7d')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition ${
              timeframe === '7d'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 días
          </button>
          <button
            id="filter-30d"
            onClick={() => setTimeframe('30d')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition ${
              timeframe === '30d'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            30 días
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar municipio / depto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-900"
          />
        </div>

        {/* Magnitude Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-semibold flex-shrink-0">Mag &ge;</span>
          <div className="flex items-center gap-1 w-full">
            {[2.5, 3.5, 4.5, 5.5].map((magVal) => (
              <button
                key={magVal}
                onClick={() => setMinMagFilter(magVal)}
                className={`flex-1 py-1 px-1.5 rounded text-[11px] font-bold transition border ${
                  minMagFilter === magVal
                    ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {magVal}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Earthquakes List with Professional Rows */}
      <div className="flex-1 overflow-y-auto max-h-[480px] divide-y divide-slate-100 custom-scrollbar">
        {filteredEarthquakes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No se encontraron eventos sísmicos</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Prueba ajustando el filtro de magnitud o rango temporal.</p>
          </div>
        ) : (
          filteredEarthquakes.map((eq) => {
            const isSelected = selectedEarthquake?.id === eq.id;
            const magColor = getMagnitudeColorClass(eq.magnitude);
            const levelText = getMagnitudeLevelText(eq.magnitude);

            return (
              <div
                key={eq.id}
                onClick={() => onSelectEarthquake(eq)}
                className={`p-4 hover:bg-slate-50 transition flex flex-col gap-2.5 cursor-pointer ${
                  isSelected ? 'bg-blue-50/70 border-l-4 border-l-blue-900' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-lg ${magColor} font-mono`}>
                        {eq.magnitude.toFixed(1)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Magnitud
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-900 mt-0.5">
                      {eq.place}
                    </div>

                    <div className="text-[11px] text-slate-500 uppercase font-medium mt-0.5 flex items-center gap-1.5">
                      <span>{getRelativeTimeSpanish(eq.time)}</span>
                      <span>•</span>
                      <span>Prof: {eq.depth} km</span>
                      <span>•</span>
                      <span>{eq.distanceToGuatemalaCityKm} km a Cd. Guatemala</span>
                    </div>
                  </div>

                  {/* Level pill box */}
                  <div className="bg-slate-100 border border-slate-200 p-2 rounded-lg text-center min-w-[65px] flex-shrink-0">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">NIVEL</div>
                    <div className={`text-xs font-black ${magColor}`}>{levelText}</div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    id={`btn-simulate-${eq.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSimulateEarthquake(eq);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-[11px] font-bold flex items-center gap-1 transition border border-slate-200 hover:border-red-200"
                    title="Simular alerta sísmica para este evento"
                  >
                    <Play className="w-3 h-3" />
                    Simular
                  </button>

                  <button
                    id={`btn-bulletin-modal-${eq.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBulletinModal(eq);
                    }}
                    className="px-2.5 py-1 rounded bg-blue-900 hover:bg-blue-800 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-sm"
                    title="Ver y exportar boletín oficial tipo INSIVUMEH"
                  >
                    <FileText className="w-3 h-3" />
                    Boletín
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info strip */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span>Fuente: USGS</span>
        <button
          onClick={() => setMinMagFilter(2.5)}
          className="text-blue-900 font-bold hover:underline"
        >
          Restablecer Filtros
        </button>
      </div>
    </div>
  );
};
