import { describe, it, expect, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';

import { initDb } from '../db';
import { registerApiRoutes } from '../routes';

describe('API routes', () => {
  let app: Express;
  let db: Database.Database;

  beforeEach(() => {
    db = initDb(':memory:');
    app = express();
    app.use(express.json());
    registerApiRoutes(app, db);
  });

  describe('POST /api/push/subscribe', () => {
    it('succeeds and upserts with a valid body', async () => {
      const body = {
        endpoint: 'https://push.example/abc',
        keys: { p256dh: 'key1', auth: 'auth1' },
        minMagnitude: 4.0,
        nearbyRadiusKm: null,
        userLat: null,
        userLng: null,
      };

      const res1 = await request(app).post('/api/push/subscribe').send(body);
      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('subscribed');

      // Upsert with a new min magnitude for the same endpoint
      const res2 = await request(app)
        .post('/api/push/subscribe')
        .send({ ...body, minMagnitude: 5.5 });
      expect(res2.status).toBe(200);
    });

    it('returns 400 when a required field is missing', async () => {
      const res = await request(app)
        .post('/api/push/subscribe')
        .send({ keys: { p256dh: 'key1', auth: 'auth1' }, minMagnitude: 4.0 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when minMagnitude is out of range or NaN', async () => {
      const base = {
        endpoint: 'https://push.example/xyz',
        keys: { p256dh: 'key1', auth: 'auth1' },
      };
      const resTooHigh = await request(app).post('/api/push/subscribe').send({ ...base, minMagnitude: 15 });
      expect(resTooHigh.status).toBe(400);

      const resNegative = await request(app).post('/api/push/subscribe').send({ ...base, minMagnitude: -1 });
      expect(resNegative.status).toBe(400);

      const resNaN = await request(app).post('/api/push/subscribe').send({ ...base, minMagnitude: NaN });
      expect(resNaN.status).toBe(400);
    });
  });

  describe('POST /api/push/unsubscribe', () => {
    it('removes a subscription', async () => {
      const endpoint = 'https://push.example/to-remove';
      await request(app).post('/api/push/subscribe').send({
        endpoint,
        keys: { p256dh: 'key1', auth: 'auth1' },
        minMagnitude: 3.0,
      });

      const res = await request(app).post('/api/push/unsubscribe').send({ endpoint });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('unsubscribed');
    });
  });

  describe('POST /api/email/subscribe', () => {
    it('succeeds and upserts with a valid body', async () => {
      const body = { email: 'user@example.com', minMagnitude: 4.0, nearbyRadiusKm: null, userLat: null, userLng: null };

      const res1 = await request(app).post('/api/email/subscribe').send(body);
      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('subscribed');

      const res2 = await request(app)
        .post('/api/email/subscribe')
        .send({ ...body, minMagnitude: 5.5 });
      expect(res2.status).toBe(200);
    });

    it('returns 400 for a malformed email', async () => {
      const res = await request(app)
        .post('/api/email/subscribe')
        .send({ email: 'not-an-email', minMagnitude: 4.0 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when minMagnitude is out of range or NaN', async () => {
      const base = { email: 'user2@example.com' };
      const resTooHigh = await request(app).post('/api/email/subscribe').send({ ...base, minMagnitude: 15 });
      expect(resTooHigh.status).toBe(400);

      const resNaN = await request(app).post('/api/email/subscribe').send({ ...base, minMagnitude: NaN });
      expect(resNaN.status).toBe(400);
    });
  });

  describe('POST /api/email/unsubscribe', () => {
    it('removes an email subscription', async () => {
      const email = 'to-remove@example.com';
      await request(app).post('/api/email/subscribe').send({ email, minMagnitude: 3.0 });

      const res = await request(app).post('/api/email/unsubscribe').send({ email });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('unsubscribed');
    });
  });

  describe('GET /api/reports', () => {
    it('returns previously-POSTed reports', async () => {
      await request(app).post('/api/reports').send({
        department: 'Escuintla',
        municipality: 'Puerto San José',
        feltIntensity: 'Fuerte',
        buildingType: 'Casa de 1 nivel',
        comments: 'Retumbo fuerte',
        timestamp: 1000,
        mercalliEstimated: 'Mercalli VI',
      });

      const res = await request(app).get('/api/reports');
      expect(res.status).toBe(200);
      expect(res.body.reports).toHaveLength(1);
      expect(res.body.reports[0].department).toBe('Escuintla');
    });
  });

  describe('POST /api/reports', () => {
    it('returns 400 when a required field is missing', async () => {
      const res = await request(app).post('/api/reports').send({
        municipality: 'Zona 10',
        feltIntensity: 'Moderado',
        buildingType: 'Casa de 1 nivel',
        timestamp: 1000,
        mercalliEstimated: 'Mercalli IV',
      });
      expect(res.status).toBe(400);
    });

    it('accepts a timestamp of 0', async () => {
      const res = await request(app).post('/api/reports').send({
        department: 'Guatemala (Capital)',
        municipality: 'Zona 1',
        feltIntensity: 'Leve',
        buildingType: 'Casa de 1 nivel',
        timestamp: 0,
        mercalliEstimated: 'Mercalli II',
      });
      expect(res.status).toBe(200);
    });
  });
});
