import React, { useState } from 'react';
import { Earthquake } from '../types';
import { formatGuatemalaTime } from '../utils/seismicCalculations';
import { X, Copy, Check, Share2, Download, ShieldCheck, Activity, MapPin } from 'lucide-react';

interface BulletinGeneratorModalProps {
  earthquake: Earthquake | null;
  onClose: () => void;
}

export const BulletinGeneratorModal: React.FC<BulletinGeneratorModalProps> = ({
  earthquake,
  onClose
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!earthquake) return null;

  const bulletinNumber = `BSM-${new Date(earthquake.time).getFullYear()}-${Math.floor(earthquake.time / 100000) % 9000 + 1000}`;
  const formattedTime = formatGuatemalaTime(earthquake.time);

  const bulletinText = `🇬🇹 *INSIVUMEH - BOLETÍN SISMOLÓGICO OFICIAL*
*Alerta Sísmica Guatemala*
---------------------------------------
📋 *Boletín Nº:* ${bulletinNumber}
🕒 *Fecha y Hora Local:* ${formattedTime} (Hora de Guatemala)
⚡ *Magnitud:* ${earthquake.magnitude.toFixed(1)} Mw
📏 *Profundidad:* ${earthquake.depth} km
📍 *Epicentro:* ${earthquake.place}
🗺️ *Región / Depto:* ${earthquake.department || 'Territorio Nacional'}
🌐 *Coordenadas:* Lat ${earthquake.latitude.toFixed(3)}° N, Lon ${earthquake.longitude.toFixed(3)}° O
🏛️ *Distancia a Cd. Guatemala:* ${earthquake.distanceToGuatemalaCityKm} km
📊 *Intensidad Estimada:* ${earthquake.intensityMercalli || 'Mercalli IV'}
---------------------------------------
⚠️ *RECOMENDACIONES CONRED:*
1. Mantenga la calma y atienda información oficial de CONRED e INSIVUMEH.
2. Tenga a mano su Mochila de las 72 Horas.
3. No propague rumores y verifique posibles daños antes de reingresar.
📞 *Emergencias Nacionales:* CONRED 119 | Bomberos 122 / 123
---------------------------------------
_Monitoreo Red Sísmica Nacional de Guatemala_`;

  const handleCopy = () => {
    navigator.clipboard.writeText(bulletinText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(bulletinText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-blue-900 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-blue-800 text-white border border-blue-700">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-tight">
                Boletín Sismológico Oficial
              </h3>
              <p className="text-xs text-blue-200 font-medium">
                Formato estándar INSIVUMEH / Red Sísmica Nacional de Guatemala
              </p>
            </div>
          </div>

          <button
            id="btn-close-bulletin-modal"
            onClick={onClose}
            className="p-2 rounded-lg bg-blue-800 hover:bg-blue-700 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Bulletin Document */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {/* Printable Official Document Box */}
          <div className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-300 shadow-xs font-mono text-xs text-slate-800 space-y-4 relative">
            {/* Header Stamp */}
            <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-slate-200 gap-2 text-center sm:text-left">
              <div>
                <span className="text-[11px] font-bold text-blue-900 tracking-wider block">
                  REPÚBLICA DE GUATEMALA
                </span>
                <span className="text-xs font-black text-slate-900 block">
                  INSIVUMEH / SECTOR SISMOLOGÍA
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  RED NACIONAL DE MONITOREO SÍSMICO
                </span>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-900 font-bold border border-blue-200 text-[11px] block font-mono">
                  {bulletinNumber}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1 font-semibold">EMISIÓN INMEDIATA</span>
              </div>
            </div>

            {/* Key Data Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-sans">
              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase block font-bold tracking-wider">Magnitud</span>
                <span className="text-xl font-black text-red-600 font-mono">
                  {earthquake.magnitude.toFixed(1)} Mw
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-500 uppercase block font-bold tracking-wider">Profundidad</span>
                <span className="text-xl font-bold text-blue-900 font-mono">
                  {earthquake.depth} km
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 uppercase block font-bold tracking-wider">Intensidad</span>
                <span className="text-sm font-bold text-slate-900">
                  {earthquake.intensityMercalli || 'Mercalli IV'}
                </span>
              </div>
            </div>

            {/* Geographic details */}
            <div className="space-y-1.5 text-xs font-sans text-slate-700 pt-2">
              <p>
                <strong className="text-slate-900">Fecha y Hora Local:</strong> {formattedTime}
              </p>
              <p>
                <strong className="text-slate-900">Región Epicentral:</strong> {earthquake.place} ({earthquake.department})
              </p>
              <p>
                <strong className="text-slate-900">Coordenadas:</strong> Latitud {earthquake.latitude.toFixed(4)}° N, Longitud {earthquake.longitude.toFixed(4)}° O
              </p>
              <p>
                <strong className="text-slate-900">Distancia a la Capital:</strong> {earthquake.distanceToGuatemalaCityKm} km
              </p>
            </div>

            {/* CONRED Official Warning */}
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-sans text-amber-950 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-900 block mb-0.5 uppercase tracking-wide text-[11px]">Protocolo CONRED Activado</strong>
                Mantenga la calma, no propague rumores en redes sociales, verifique sus instalaciones y reporte cualquier emergencia a la línea nacional 119 de CONRED.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              id="btn-copy-bulletin-text"
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300 flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-green-700">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>Copiar Texto Oficial</span>
                </>
              )}
            </button>

            <button
              id="btn-share-whatsapp"
              onClick={handleShareWhatsApp}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir en WhatsApp</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
