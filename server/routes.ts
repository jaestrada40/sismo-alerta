import { Express } from 'express';
import Database from 'better-sqlite3';

import {
  insertSubscription,
  deleteSubscriptionByEndpoint,
  insertReport,
  getAllReports,
} from './db';

// Comments longer than this are rejected with a 400 (rather than silently truncated),
// so the user gets clear feedback instead of a surprising data loss.
const MAX_COMMENTS_LENGTH = 1000;

export function registerApiRoutes(app: Express, db: Database.Database): void {
  app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
  });

  app.post('/api/push/subscribe', (req, res) => {
    const { endpoint, keys, minMagnitude, nearbyRadiusKm, userLat, userLng } = req.body;
    if (
      !endpoint ||
      !keys?.p256dh ||
      !keys?.auth ||
      typeof minMagnitude !== 'number' ||
      !Number.isFinite(minMagnitude) ||
      minMagnitude < 0 ||
      minMagnitude > 10
    ) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }
    insertSubscription(db, {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      min_magnitude: minMagnitude,
      nearby_radius_km: nearbyRadiusKm ?? null,
      user_lat: userLat ?? null,
      user_lng: userLng ?? null,
    });
    res.json({ status: 'subscribed' });
  });

  app.post('/api/push/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint requerido' });
    deleteSubscriptionByEndpoint(db, endpoint);
    res.json({ status: 'unsubscribed' });
  });

  app.get('/api/reports', (req, res) => {
    res.json({ reports: getAllReports(db) });
  });

  app.post('/api/reports', (req, res) => {
    const { department, municipality, feltIntensity, buildingType, comments, timestamp, mercalliEstimated, earthquakeId } = req.body;
    if (
      !department ||
      !municipality ||
      !feltIntensity ||
      !buildingType ||
      typeof timestamp !== 'number' ||
      !Number.isFinite(timestamp) ||
      !mercalliEstimated
    ) {
      return res.status(400).json({ error: 'Reporte incompleto' });
    }
    if (typeof comments === 'string' && comments.length > MAX_COMMENTS_LENGTH) {
      return res.status(400).json({ error: `Los comentarios no pueden exceder ${MAX_COMMENTS_LENGTH} caracteres` });
    }
    const report = insertReport(db, {
      department,
      municipality,
      feltIntensity,
      buildingType,
      comments,
      timestamp,
      mercalliEstimated,
      earthquakeId,
    });
    res.json({ report });
  });
}
