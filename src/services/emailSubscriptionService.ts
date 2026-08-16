// src/services/emailSubscriptionService.ts

export async function subscribeToEmail(
  email: string,
  minMagnitude: number,
  nearbyRadiusKm: number | null,
  userLat: number | null,
  userLng: number | null
): Promise<void> {
  const res = await fetch('/api/email/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, minMagnitude, nearbyRadiusKm, userLat, userLng }),
  });
  if (!res.ok) {
    throw new Error('No se pudo activar las notificaciones por correo');
  }
}

export async function unsubscribeFromEmail(email: string): Promise<void> {
  const res = await fetch('/api/email/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error('No se pudo desactivar las notificaciones por correo');
  }
}
