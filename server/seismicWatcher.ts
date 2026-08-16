import type { Database } from 'better-sqlite3';
import type { Earthquake } from '../src/types';
import type { PushSubscriptionRow, EmailSubscriptionRow } from './db';
import { calculateDistanceKm } from '../src/utils/seismicCalculations';

interface MagnitudeRadiusSubscription {
  min_magnitude: number;
  nearby_radius_km: number | null;
  user_lat: number | null;
  user_lng: number | null;
}

export function selectNotifications<S extends MagnitudeRadiusSubscription>(
  newQuakes: Earthquake[],
  subscriptions: S[]
): Array<{ subscription: S; earthquake: Earthquake }> {
  const matches: Array<{ subscription: S; earthquake: Earthquake }> = [];

  for (const earthquake of newQuakes) {
    for (const subscription of subscriptions) {
      if (earthquake.magnitude >= subscription.min_magnitude) {
        matches.push({ subscription, earthquake });
        continue;
      }

      if (
        subscription.nearby_radius_km != null &&
        subscription.user_lat != null &&
        subscription.user_lng != null
      ) {
        const distanceKm = calculateDistanceKm(
          subscription.user_lat,
          subscription.user_lng,
          earthquake.latitude,
          earthquake.longitude
        );
        if (distanceKm <= subscription.nearby_radius_km) {
          matches.push({ subscription, earthquake });
        }
      }
    }
  }

  return matches;
}

interface PollDeps {
  db: Database;
  fetchQuakes: () => Promise<Earthquake[]>;
  sendPush: (sub: PushSubscriptionRow, eq: Earthquake) => Promise<void>;
  hasSeenEarthquake: (db: Database, usgsId: string) => boolean;
  markEarthquakeSeen: (db: Database, usgsId: string) => void;
  getAllSubscriptions: (db: Database) => PushSubscriptionRow[];
  sendEmail?: (sub: EmailSubscriptionRow, eq: Earthquake) => Promise<void>;
  getAllEmailSubscriptions?: (db: Database) => EmailSubscriptionRow[];
}

export async function pollAndNotify(deps: PollDeps): Promise<void> {
  let quakes: Earthquake[];
  try {
    quakes = await deps.fetchQuakes();
  } catch (err) {
    console.warn('seismicWatcher: fallo consultando USGS, se reintenta en el próximo ciclo:', err);
    return;
  }

  const newQuakes = quakes.filter((q) => !deps.hasSeenEarthquake(deps.db, q.id));
  if (newQuakes.length === 0) return;

  const subscriptions = deps.getAllSubscriptions(deps.db);
  const notifications = selectNotifications(newQuakes, subscriptions);

  for (const { subscription, earthquake } of notifications) {
    try {
      await deps.sendPush(subscription, earthquake);
    } catch (err) {
      console.warn('seismicWatcher: fallo enviando push a suscriptor:', err);
    }
  }

  if (deps.sendEmail && deps.getAllEmailSubscriptions) {
    const emailSubscriptions = deps.getAllEmailSubscriptions(deps.db);
    const emailNotifications = selectNotifications(newQuakes, emailSubscriptions);

    for (const { subscription, earthquake } of emailNotifications) {
      try {
        await deps.sendEmail(subscription, earthquake);
      } catch (err) {
        console.warn('seismicWatcher: fallo enviando correo a suscriptor:', err);
      }
    }
  }

  for (const quake of newQuakes) {
    deps.markEarthquakeSeen(deps.db, quake.id);
  }
}
