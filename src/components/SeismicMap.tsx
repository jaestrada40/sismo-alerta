import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Earthquake, SeismicFault } from '../types';
import { GUATEMALA_FAULTS } from '../data/guatemalaData';
import { formatGuatemalaTime } from '../utils/seismicCalculations';
import { Layers, Eye, Info, MapPin } from 'lucide-react';

interface SeismicMapProps {
  earthquakes: Earthquake[];
  selectedEarthquake: Earthquake | null;
  onSelectEarthquake: (eq: Earthquake) => void;
  activeSimulationLocation?: { lat: number; lng: number; name: string } | null;
  userLocation?: { lat: number; lng: number; name: string } | null;
  onOpenBulletinModal: (eq: Earthquake) => void;
}

export const SeismicMap: React.FC<SeismicMapProps> = ({
  earthquakes,
  selectedEarthquake,
  onSelectEarthquake,
  activeSimulationLocation,
  userLocation,
  onOpenBulletinModal
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const faultsLayerRef = useRef<L.LayerGroup | null>(null);

  const [showFaults, setShowFaults] = useState<boolean>(true);
  const [selectedFault, setSelectedFault] = useState<SeismicFault | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Guatemala geographic center (15.3°N, -90.4°W)
    const map = L.map(mapContainerRef.current, {
      center: [15.2, -90.4],
      zoom: 7.5,
      minZoom: 6,
      maxZoom: 14,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // High performance CartoDB Voyager / Positron tile layer for crisp professional maps
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> | INSIVUMEH & USGS',
        subdomains: 'abcd',
        maxZoom: 19
      }
    ).addTo(map);

    const faultsLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    faultsLayerRef.current = faultsLayer;
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render Fault Lines
  useEffect(() => {
    if (!mapInstanceRef.current || !faultsLayerRef.current) return;

    faultsLayerRef.current.clearLayers();

    if (showFaults) {
      GUATEMALA_FAULTS.forEach((fault) => {
        const polyline = L.polyline(fault.coordinates, {
          color: fault.color,
          weight: fault.name.includes('Motagua') ? 4 : 3,
          opacity: 0.85,
          dashArray: fault.name.includes('Subducción') ? '6, 8' : undefined
        });

        polyline.bindTooltip(
          `<strong>${fault.name}</strong><br/><span style="font-size:11px">${fault.type}</span>`,
          { className: 'seismic-tooltip', direction: 'top' }
        );

        polyline.on('click', () => {
          setSelectedFault(fault);
        });

        polyline.addTo(faultsLayerRef.current!);
      });
    }
  }, [showFaults]);

  // Render Earthquake Markers & User Location
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    // Add User Location Marker
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
            <div class="relative w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-md flex items-center justify-center text-white text-[9px] font-bold">
              📍
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .bindPopup(`<strong>Tu Ubicación:</strong> ${userLocation.name}`)
        .addTo(markersLayerRef.current);
    }

    // Add Simulation Epicenter if active
    if (activeSimulationLocation) {
      const simCircle = L.circle([activeSimulationLocation.lat, activeSimulationLocation.lng], {
        radius: 45000,
        color: '#ef4444',
        fillColor: '#dc2626',
        fillOpacity: 0.25,
        weight: 2
      }).addTo(markersLayerRef.current);

      L.marker([activeSimulationLocation.lat, activeSimulationLocation.lng], {
        icon: L.divIcon({
          className: 'sim-marker',
          html: `<div class="p-1 px-2 rounded-md bg-red-600 text-white text-xs font-black border border-white shadow-xl animate-pulse">⚡ EPICENTRO SIMULADO</div>`,
          iconAnchor: [60, 15]
        })
      }).addTo(markersLayerRef.current);
    }

    // Add Earthquake Circles
    earthquakes.forEach((eq) => {
      const isSelected = selectedEarthquake?.id === eq.id;
      
      // Color by magnitude
      let color = '#38bdf8'; // < 4.0
      let fillColor = '#0284c7';
      if (eq.magnitude >= 6.5) {
        color = '#dc2626';
        fillColor = '#ef4444';
      } else if (eq.magnitude >= 5.0) {
        color = '#ea580c';
        fillColor = '#f97316';
      } else if (eq.magnitude >= 4.0) {
        color = '#eab308';
        fillColor = '#facc15';
      }

      // Radius scaled with magnitude (e.g. 5.0 -> ~20km, 7.0 -> ~65km)
      const radiusMeters = Math.max(8000, Math.pow(eq.magnitude, 2.3) * 1200);

      const circle = L.circle([eq.latitude, eq.longitude], {
        radius: radiusMeters,
        color: isSelected ? '#ffffff' : color,
        fillColor: fillColor,
        fillOpacity: isSelected ? 0.6 : 0.35,
        weight: isSelected ? 3 : 1.5
      });

      // Custom pulsing center dot
      const dotMarker = L.marker([eq.latitude, eq.longitude], {
        icon: L.divIcon({
          className: 'mag-dot',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-md border border-white/80" style="background-color: ${color}">
                ${eq.magnitude.toFixed(1)}
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      });

      const popupContent = document.createElement('div');
      popupContent.className = 'text-slate-900 text-xs p-1 font-sans';
      popupContent.innerHTML = `
        <div style="font-family: system-ui, sans-serif; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px;">
            <span style="font-weight: 800; font-size: 14px; color: ${color};">M ${eq.magnitude.toFixed(1)}</span>
            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">${eq.depth} km prof.</span>
          </div>
          <p style="margin: 0 0 4px; font-weight: 600; color: #0f172a;">${eq.place}</p>
          <p style="margin: 0 0 4px; color: #64748b; font-size: 11px;">Hora GT: ${formatGuatemalaTime(eq.time)}</p>
          <p style="margin: 0 0 6px; color: #475569; font-size: 11px;">
            <strong>Distancia a Cd. Guatemala:</strong> ${eq.distanceToGuatemalaCityKm} km<br/>
            <strong>Intensidad estimada:</strong> ${eq.intensityMercalli || 'N/A'}
          </p>
          <button id="btn-bulletin-${eq.id}" style="width: 100%; background: #0f172a; color: white; border: none; border-radius: 6px; padding: 6px 8px; font-weight: 600; font-size: 11px; cursor: pointer;">
            Generar Boletín INSIVUMEH
          </button>
        </div>
      `;

      circle.on('click', () => {
        onSelectEarthquake(eq);
      });

      dotMarker.on('click', () => {
        onSelectEarthquake(eq);
      });

      circle.bindPopup(popupContent);
      dotMarker.bindPopup(popupContent);

      dotMarker.on('popupopen', () => {
        const btn = document.getElementById(`btn-bulletin-${eq.id}`);
        if (btn) {
          btn.onclick = () => onOpenBulletinModal(eq);
        }
      });

      circle.addTo(markersLayerRef.current!);
      dotMarker.addTo(markersLayerRef.current!);
    });
  }, [earthquakes, selectedEarthquake, activeSimulationLocation, userLocation]);

  // Center on selected earthquake
  useEffect(() => {
    if (selectedEarthquake && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [selectedEarthquake.latitude, selectedEarthquake.longitude],
        9,
        { duration: 1.2 }
      );
    }
  }, [selectedEarthquake]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Card Header matching Design */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50 gap-2">
        <h2 className="font-bold text-slate-700 uppercase text-xs tracking-wider flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-900" />
          Monitoreo Geofísico en Tiempo Real
        </h2>
        <div className="flex gap-2">
          <span className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-600 font-bold uppercase">
            Capas: Sismos Recientes
          </span>
          <button
            id="btn-toggle-faults"
            onClick={() => setShowFaults(!showFaults)}
            className={`px-2 py-1 border rounded text-[10px] font-bold uppercase transition flex items-center gap-1 ${
              showFaults
                ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Zonas de Falla ({showFaults ? 'Activas' : 'Ocultas'})</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[460px] sm:h-[520px] lg:h-[560px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 text-[10px] space-y-1.5 shadow-md max-w-[240px] sm:max-w-xs text-slate-700">
          <div className="font-bold text-slate-900 mb-1 flex items-center justify-between text-[11px]">
            <span>Escala de Magnitudes</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.6)]"></span>
              <span className="font-semibold text-slate-800">Magnitud &gt; 5.0 (Fuerte / Severo)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              <span className="font-semibold text-slate-800">Magnitud 4.0 - 5.0 (Moderado)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span className="font-semibold text-slate-800">Magnitud &lt; 4.0 (Menor / Leve)</span>
            </div>
          </div>

          {showFaults && (
            <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-[9px] text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 bg-red-600 rounded"></span>
                <span>Falla de Motagua (Límite Placas)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 bg-orange-500 rounded"></span>
                <span>Falla Chixoy-Polochic</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 border-b-2 border-dashed border-rose-600"></span>
                <span>Subducción Placa de Cocos</span>
              </div>
            </div>
          )}
        </div>

        {/* Fault Info Modal if Clicked */}
        {selectedFault && (
          <div className="absolute top-4 right-4 sm:right-14 z-20 bg-white/95 backdrop-blur-md p-4 rounded-xl border border-slate-200 text-xs text-slate-800 shadow-xl max-w-xs animate-in fade-in">
            <div className="flex items-start justify-between">
              <h4 className="font-bold text-red-600 text-sm">{selectedFault.name}</h4>
              <button
                onClick={() => setSelectedFault(null)}
                className="text-slate-400 hover:text-slate-700 ml-2 text-base font-bold"
              >
                &times;
              </button>
            </div>
            <p className="text-[11px] text-blue-900 font-bold mt-0.5">{selectedFault.type}</p>
            <p className="mt-2 text-slate-600 text-[11px] leading-relaxed">{selectedFault.description}</p>
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-500">
              <span className="font-semibold">Riesgo Sísmico:</span>
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 font-bold border border-red-200">
                {selectedFault.riskLevel}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
