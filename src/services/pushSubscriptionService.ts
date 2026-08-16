// src/services/pushSubscriptionService.ts
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToPush(
  minMagnitude: number,
  nearbyRadiusKm: number | null,
  userLat: number | null,
  userLng: number | null
): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este navegador no soporta notificaciones push');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones no concedido');
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const { publicKey } = await fetch('/api/push/vapid-public-key').then((r) => r.json());
  if (!publicKey) {
    throw new Error('El servidor no tiene configurada la clave VAPID');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      minMagnitude,
      nearbyRadiusKm,
      userLat,
      userLng,
    }),
  });
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/sw.js');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}
