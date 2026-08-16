// server/pushService.ts
import webpush from 'web-push';
import type { Earthquake } from '../src/types';
import type { PushSubscriptionRow } from './db';

export function configurePushService(publicKey: string, privateKey: string): void {
  webpush.setVapidDetails('mailto:alertas@example.gt', publicKey, privateKey);
}

export async function sendEarthquakePush(
  sub: PushSubscriptionRow,
  earthquake: Earthquake,
  onExpired: (endpoint: string) => void
): Promise<void> {
  const payload = JSON.stringify({
    title: `M${earthquake.magnitude.toFixed(1)} · ${earthquake.place}`,
    body: 'Sismo confirmado — revisa tu zona y sigue el protocolo de seguridad.',
    earthquakeId: earthquake.id,
    url: `/?eq=${earthquake.id}`,
  });

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
  } catch (err: any) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      onExpired(sub.endpoint);
    } else {
      console.warn('pushService: fallo enviando notificación a', sub.endpoint, err.message);
    }
  }
}
