import React, { useEffect, useState } from 'react';
import { AlertOctagon, VolumeX, Shield, Timer, Flame, MapPin } from 'lucide-react';
import { SimulationResult, SeismicSimulationConfig } from '../types';
import { seismicAudio } from '../utils/seismicAudio';

interface AlertBannerProps {
  activeAlert: {
    config: SeismicSimulationConfig;
    result: SimulationResult;
    startedAt: number;
  } | null;
  onDismiss: () => void;
  audioEnabled: boolean;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  activeAlert,
  onDismiss,
  audioEnabled
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [hasImpacted, setHasImpacted] = useState<boolean>(false);

  useEffect(() => {
    if (!activeAlert) {
      seismicAudio.stopSeismicSiren();
      return;
    }

    const totalSeconds = Math.max(1, Math.round(activeAlert.result.sWaveArrivalSec));
    setSecondsRemaining(totalSeconds);
    setHasImpacted(false);

    if (audioEnabled) {
      seismicAudio.startSeismicSiren();
      seismicAudio.speakAlert(
        `Alerta sísmica en Guatemala. Sismo de magnitud ${activeAlert.config.magnitude} con epicentro en ${activeAlert.config.epicenterName}. Tiempo estimado de arribo: ${totalSeconds} segundos. Agáchate, cúbrete y sujétate.`
      );
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activeAlert.startedAt) / 1000);
      const remaining = totalSeconds - elapsed;

      if (remaining <= 0) {
        setSecondsRemaining(0);
        setHasImpacted(true);
        // Play final wave sound
        if (audioEnabled) {
          seismicAudio.playSeismicBeep(330, 600);
        }
      } else {
        setSecondsRemaining(remaining);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      seismicAudio.stopSeismicSiren();
    };
  }, [activeAlert, audioEnabled]);

  if (!activeAlert) return null;

  const { config, result } = activeAlert;

  const getAlertColor = () => {
    switch (result.alertLevel) {
      case 'CRÍTICO':
      case 'SEVERO':
        return 'from-red-950 via-red-900 to-amber-950 border-red-500 text-red-50';
      case 'FUERTE':
        return 'from-orange-950 via-amber-900 to-slate-900 border-orange-500 text-amber-50';
      default:
        return 'from-amber-950 via-slate-900 to-slate-900 border-amber-500 text-slate-100';
    }
  };

  return (
    <div className="relative z-50 w-full animate-bounce-short">
      <div className="w-full bg-red-700 text-white shadow-xl p-4 sm:p-5 border-b-4 border-red-900 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Main Alert Info */}
          <div className="flex items-start sm:items-center space-x-3.5 w-full lg:w-auto">
            <div className="p-3 rounded-xl bg-white text-red-700 shadow-md flex-shrink-0 animate-pulse">
              <AlertOctagon className="w-8 h-8 font-black" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-black text-white tracking-wider uppercase">
                  ¡ALERTA SÍSMICA NACIONAL!
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-800 text-red-100 border border-red-600">
                  Nivel {result.alertLevel}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white mt-1 uppercase tracking-tight">
                Magnitud <span className="text-yellow-300 font-black">{config.magnitude.toFixed(1)}</span> • Epicentro: {config.epicenterName}
              </h2>

              <p className="text-xs text-red-100 flex items-center gap-1.5 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-yellow-300" />
                Tu ubicación: <strong className="text-white font-bold">{config.userLocationName}</strong> (a {result.epicentralDistanceKm} km del epicentro)
              </p>
            </div>
          </div>

          {/* Countdown & Intensities */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 sm:gap-5 w-full lg:w-auto bg-red-900/60 p-3 sm:p-4 rounded-xl border border-red-500/40">
            {/* S-Wave Countdown Clock */}
            <div className="text-center px-2 sm:px-3">
              <span className="text-[10px] uppercase tracking-wider text-red-200 font-bold block">
                {hasImpacted ? 'Onda S Arribada' : 'Arribo Estimado'}
              </span>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <Timer className={`w-4 h-4 ${hasImpacted ? 'text-yellow-300' : 'text-yellow-300 animate-spin'}`} />
                <span className="text-2xl sm:text-3xl font-black font-mono text-yellow-300">
                  {hasImpacted ? '¡IMPACTO!' : `${secondsRemaining} seg`}
                </span>
              </div>
            </div>

            {/* Estimated Mercalli Intensity */}
            <div className="text-center px-2 sm:px-3 border-x border-red-600">
              <span className="text-[10px] uppercase tracking-wider text-red-200 font-bold block">
                Intensidad Mercalli
              </span>
              <span className="text-base sm:text-lg font-black block mt-0.5 text-white">
                Grado {result.estimatedMercalliIntensity.roman} ({result.estimatedMercalliIntensity.level})
              </span>
            </div>

            {/* Directives & Dismiss */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="hidden sm:block text-left text-[11px] bg-red-950/70 px-3 py-1.5 rounded-lg border border-red-800 font-bold">
                <span className="text-yellow-300 block">1. Agáchate</span>
                <span className="text-yellow-200 block">2. Cúbrete</span>
                <span className="text-white block">3. Sujétate</span>
              </div>

              <button
                id="btn-dismiss-alert"
                onClick={() => {
                  seismicAudio.stopSeismicSiren();
                  onDismiss();
                }}
                className="px-3.5 py-2 bg-white hover:bg-red-50 text-red-900 rounded-lg text-xs font-bold shadow-md transition flex items-center gap-1.5"
              >
                <VolumeX className="w-4 h-4 text-red-700" />
                Cerrar Alarma
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
