import { describe, it, expect, beforeEach } from 'vitest';
import {
  initDb,
  insertSubscription,
  deleteSubscriptionByEndpoint,
  getAllSubscriptions,
  insertEmailSubscription,
  deleteEmailSubscriptionByEmail,
  getAllEmailSubscriptions,
  hasSeenEarthquake,
  markEarthquakeSeen,
  insertReport,
  getAllReports,
} from '../db';

describe('db', () => {
  let db: ReturnType<typeof initDb>;

  beforeEach(() => {
    db = initDb(':memory:');
  });

  it('inserts and lists push subscriptions', () => {
    insertSubscription(db, {
      endpoint: 'https://push.example/abc',
      p256dh: 'key1',
      auth: 'auth1',
      min_magnitude: 4.0,
      nearby_radius_km: null,
      user_lat: null,
      user_lng: null,
    });

    const rows = getAllSubscriptions(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].endpoint).toBe('https://push.example/abc');
    expect(rows[0].min_magnitude).toBe(4.0);
  });

  it('upserts by endpoint instead of duplicating', () => {
    insertSubscription(db, {
      endpoint: 'https://push.example/abc',
      p256dh: 'key1',
      auth: 'auth1',
      min_magnitude: 4.0,
      nearby_radius_km: null,
      user_lat: null,
      user_lng: null,
    });
    insertSubscription(db, {
      endpoint: 'https://push.example/abc',
      p256dh: 'key1',
      auth: 'auth1',
      min_magnitude: 5.5,
      nearby_radius_km: 50,
      user_lat: 14.6,
      user_lng: -90.5,
    });

    const rows = getAllSubscriptions(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].min_magnitude).toBe(5.5);
  });

  it('deletes a subscription by endpoint', () => {
    insertSubscription(db, {
      endpoint: 'https://push.example/abc',
      p256dh: 'key1',
      auth: 'auth1',
      min_magnitude: 4.0,
      nearby_radius_km: null,
      user_lat: null,
      user_lng: null,
    });
    deleteSubscriptionByEndpoint(db, 'https://push.example/abc');
    expect(getAllSubscriptions(db)).toHaveLength(0);
  });

  it('inserts and lists email subscriptions', () => {
    insertEmailSubscription(db, {
      email: 'user@example.com',
      min_magnitude: 4.5,
      nearby_radius_km: null,
      user_lat: null,
      user_lng: null,
    });

    const rows = getAllEmailSubscriptions(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('user@example.com');
    expect(rows[0].min_magnitude).toBe(4.5);
  });

  it('upserts email subscriptions by email instead of duplicating', () => {
    insertEmailSubscription(db, {
      email: 'user@example.com',
      min_magnitude: 4.5,
      nearby_radius_km: null,
      user_lat: null,
      user_lng: null,
    });
    insertEmailSubscription(db, {
      email: 'user@example.com',
      min_magnitude: 3.0,
      nearby_radius_km: 30,
      user_lat: 14.6,
      user_lng: -90.5,
    });

    const rows = getAllEmailSubscriptions(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].min_magnitude).toBe(3.0);
  });

  it('deletes an email subscription by email', () => {
    insertEmailSubscription(db, {
      email: 'user@example.com',
      min_magnitude: 4.5,
      nearby_radius_km: null,
      user_lat: null,
      user_lng: null,
    });
    deleteEmailSubscriptionByEmail(db, 'user@example.com');
    expect(getAllEmailSubscriptions(db)).toHaveLength(0);
  });

  it('tracks seen earthquakes', () => {
    expect(hasSeenEarthquake(db, 'usgs_1')).toBe(false);
    markEarthquakeSeen(db, 'usgs_1');
    expect(hasSeenEarthquake(db, 'usgs_1')).toBe(true);
  });

  it('inserts and lists community reports newest-first', () => {
    insertReport(db, {
      department: 'Escuintla',
      municipality: 'Puerto San José',
      feltIntensity: 'Fuerte',
      buildingType: 'Casa de 1 nivel',
      comments: 'Retumbo fuerte',
      timestamp: 1000,
      mercalliEstimated: 'Mercalli VI',
      earthquakeId: undefined,
    });
    insertReport(db, {
      department: 'Guatemala (Capital)',
      municipality: 'Zona 10',
      feltIntensity: 'Leve',
      buildingType: 'Edificio de apartamentos / oficinas',
      comments: undefined,
      timestamp: 2000,
      mercalliEstimated: 'Mercalli III',
      earthquakeId: undefined,
    });

    const rows = getAllReports(db);
    expect(rows).toHaveLength(2);
    expect(rows[0].timestamp).toBe(2000); // newest first
    expect(rows[1].department).toBe('Escuintla');
  });
});
