// src/components/NotificationSettings.tsx
import React, { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { subscribeToPush, unsubscribeFromPush } from '../services/pushSubscriptionService';

export const NotificationSettings: React.FC = () => {
  const [minMagnitude, setMinMagnitude] = useState<number>(4.0);
  const [nearbyEnabled, setNearbyEnabled] = useState<boolean>(false);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [status, setStatus] = useState<'idle' | 'subscribed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // On mount, check whether the browser already has an active push subscription
  // so a returning subscribed user doesn't see a misleading "Activar" state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!('serviceWorker' in navigator)) return;
        const registration = await navigator.serviceWorker.getRegistration('/sw.js');
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled && subscription) {
          setStatus('subscribed');
        }
      } catch {
        // Ignore — leave status as 'idle' if detection fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubscribe = async () => {
    setErrorMessage('');
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      if (nearbyEnabled) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
      await subscribeToPush(minMagnitude, nearbyEnabled ? radiusKm : null, lat, lng);
      setStatus('subscribed');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'No se pudo activar las notificaciones');
    }
  };

  const handleUnsubscribe = async () => {
    await unsubscribeFromPush();
    setStatus('idle');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
        <Bell className="w-4 h-4 text-blue-900" />
        Notificaciones de Sismos
      </h3>

      <div>
        <label className="text-xs font-bold text-slate-700 block mb-1">
          Notificarme desde magnitud: <span className="text-blue-900">{minMagnitude.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={2.5}
          max={7.0}
          step={0.1}
          value={minMagnitude}
          onChange={(e) => setMinMagnitude(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="nearby-toggle"
          type="checkbox"
          checked={nearbyEnabled}
          onChange={(e) => setNearbyEnabled(e.target.checked)}
        />
        <label htmlFor="nearby-toggle" className="text-xs font-bold text-slate-700">
          Avisarme de sismos menores si están cerca de mí (usa tu ubicación GPS)
        </label>
      </div>

      {nearbyEnabled && (
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Radio: <span className="text-blue-900">{radiusKm} km</span>
          </label>
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>
      )}

      {status === 'subscribed' ? (
        <button
          onClick={handleUnsubscribe}
          className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          <BellOff className="w-3.5 h-3.5" />
          Desactivar Notificaciones
        </button>
      ) : (
        <button
          onClick={handleSubscribe}
          className="w-full py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          <Bell className="w-3.5 h-3.5" />
          Activar Notificaciones
        </button>
      )}

      {status === 'error' && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{errorMessage}</p>
      )}
    </div>
  );
};
