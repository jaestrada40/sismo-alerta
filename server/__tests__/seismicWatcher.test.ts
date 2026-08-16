import { describe, it, expect, vi } from 'vitest';
import { selectNotifications, pollAndNotify } from '../seismicWatcher';
import type { Earthquake } from '../../src/types';
import type { PushSubscriptionRow } from '../db';

function makeQuake(overrides: Partial<Earthquake> = {}): Earthquake {
  return {
    id: 'eq_1',
    magnitude: 5.0,
    place: 'Escuintla',
    time: Date.now(),
    updated: Date.now(),
    depth: 20,
    latitude: 14.3,
    longitude: -90.7,
    url: 'https://earthquake.usgs.gov',
    status: 'reviewed',
    tsunami: 0,
    sig: 400,
    ...overrides,
  };
}

function makeSub(overrides: Partial<PushSubscriptionRow> = {}): PushSubscriptionRow {
  return {
    id: 1,
    endpoint: 'https://push.example/1',
    p256dh: 'k',
    auth: 'a',
    min_magnitude: 4.0,
    nearby_radius_km: null,
    user_lat: null,
    user_lng: null,
    created_at: Date.now(),
    ...overrides,
  };
}

describe('selectNotifications', () => {
  it('matches a subscriber whose threshold the magnitude meets', () => {
    const quake = makeQuake({ magnitude: 4.5 });
    const sub = makeSub({ min_magnitude: 4.0 });
    expect(selectNotifications([quake], [sub])).toEqual([{ subscription: sub, earthquake: quake }]);
  });

  it('excludes a subscriber whose threshold the magnitude misses and who has no nearby radius', () => {
    const quake = makeQuake({ magnitude: 3.0 });
    const sub = makeSub({ min_magnitude: 4.0, nearby_radius_km: null });
    expect(selectNotifications([quake], [sub])).toEqual([]);
  });

  it('matches a subscriber below threshold if the quake is within their nearby radius', () => {
    // Guatemala City coords; quake epicenter ~34km away (matches Escuintla fixture in usgsService)
    const quake = makeQuake({ magnitude: 3.0, latitude: 14.40, longitude: -90.72 });
    const sub = makeSub({
      min_magnitude: 5.0,
      nearby_radius_km: 50,
      user_lat: 14.6349,
      user_lng: -90.5069,
    });
    expect(selectNotifications([quake], [sub])).toEqual([{ subscription: sub, earthquake: quake }]);
  });

  it('excludes a subscriber below threshold if the quake is outside their nearby radius', () => {
    const quake = makeQuake({ magnitude: 3.0, latitude: 14.40, longitude: -90.72 });
    const sub = makeSub({
      min_magnitude: 5.0,
      nearby_radius_km: 10,
      user_lat: 14.6349,
      user_lng: -90.5069,
    });
    expect(selectNotifications([quake], [sub])).toEqual([]);
  });

  it('produces one entry per matching (quake, subscriber) pair across multiple quakes and subscribers', () => {
    const q1 = makeQuake({ id: 'eq_1', magnitude: 5.0 });
    const q2 = makeQuake({ id: 'eq_2', magnitude: 3.0 });
    const subHigh = makeSub({ id: 1, min_magnitude: 4.0 });
    const subLow = makeSub({ id: 2, min_magnitude: 2.0 });

    const result = selectNotifications([q1, q2], [subHigh, subLow]);
    expect(result).toHaveLength(3); // q1->subHigh, q1->subLow, q2->subLow
  });
});

describe('pollAndNotify', () => {
  it('marks new quakes as seen and sends push only to matching subscribers, skipping already-seen quakes', async () => {
    const quake = makeQuake({ id: 'eq_new', magnitude: 5.0 });
    const sub = makeSub({ min_magnitude: 4.0 });

    const db = {} as any; // opaque handle passed through to the injected functions below
    const fetchQuakes = vi.fn().mockResolvedValue([quake]);
    const sendPush = vi.fn().mockResolvedValue(undefined);
    const hasSeenEarthquake = vi.fn().mockReturnValue(false);
    const markEarthquakeSeen = vi.fn();
    const getAllSubscriptions = vi.fn().mockReturnValue([sub]);

    await pollAndNotify({
      db,
      fetchQuakes,
      sendPush,
      hasSeenEarthquake,
      markEarthquakeSeen,
      getAllSubscriptions,
    });

    expect(sendPush).toHaveBeenCalledWith(sub, quake);
    expect(markEarthquakeSeen).toHaveBeenCalledWith(db, 'eq_new');
  });

  it('does not notify or re-mark an already-seen quake', async () => {
    const quake = makeQuake({ id: 'eq_old', magnitude: 5.0 });
    const sub = makeSub({ min_magnitude: 4.0 });

    const db = {} as any;
    const fetchQuakes = vi.fn().mockResolvedValue([quake]);
    const sendPush = vi.fn().mockResolvedValue(undefined);
    const hasSeenEarthquake = vi.fn().mockReturnValue(true);
    const markEarthquakeSeen = vi.fn();
    const getAllSubscriptions = vi.fn().mockReturnValue([sub]);

    await pollAndNotify({
      db,
      fetchQuakes,
      sendPush,
      hasSeenEarthquake,
      markEarthquakeSeen,
      getAllSubscriptions,
    });

    expect(sendPush).not.toHaveBeenCalled();
    expect(markEarthquakeSeen).not.toHaveBeenCalled();
  });

  it('swallows fetch errors without throwing', async () => {
    const fetchQuakes = vi.fn().mockRejectedValue(new Error('USGS down'));
    const sendPush = vi.fn();
    const hasSeenEarthquake = vi.fn();
    const markEarthquakeSeen = vi.fn();
    const getAllSubscriptions = vi.fn().mockReturnValue([]);

    await expect(
      pollAndNotify({
        db: {} as any,
        fetchQuakes,
        sendPush,
        hasSeenEarthquake,
        markEarthquakeSeen,
        getAllSubscriptions,
      })
    ).resolves.toBeUndefined();
    expect(sendPush).not.toHaveBeenCalled();
  });

  it('swallows sendPush errors without throwing, still marks quake as seen', async () => {
    const quake = makeQuake({ id: 'eq_failed_push', magnitude: 5.0 });
    const sub = makeSub({ min_magnitude: 4.0 });

    const db = {} as any;
    const fetchQuakes = vi.fn().mockResolvedValue([quake]);
    const sendPush = vi.fn().mockRejectedValue(new Error('push endpoint expired'));
    const hasSeenEarthquake = vi.fn().mockReturnValue(false);
    const markEarthquakeSeen = vi.fn();
    const getAllSubscriptions = vi.fn().mockReturnValue([sub]);

    await expect(
      pollAndNotify({
        db,
        fetchQuakes,
        sendPush,
        hasSeenEarthquake,
        markEarthquakeSeen,
        getAllSubscriptions,
      })
    ).resolves.toBeUndefined();

    expect(sendPush).toHaveBeenCalledWith(sub, quake);
    expect(markEarthquakeSeen).toHaveBeenCalledWith(db, 'eq_failed_push');
  });
});
