import type { Database } from 'better-sqlite3';
import type { Earthquake } from '../src/types';
import type { PushSubscriptionRow } from './db';
import { calculateDistanceKm } from '../src/utils/seismicCalculations';

export function selectNotifications(
  newQuakes: Earthquake[],
  subscriptions: PushSubscriptionRow[]
): Array<{ subscription: PushSubscriptionRow; earthquake: Earthquake }> {
  const matches: Array<{ subscription: PushSubscriptionRow; earthquake: Earthquake }> = [];

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
    await deps.sendPush(subscription, earthquake);
  }

  for (const quake of newQuakes) {
    deps.markEarthquakeSeen(deps.db, quake.id);
  }
}
