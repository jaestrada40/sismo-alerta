import { describe, it, expect, vi } from 'vitest';
import { isLikelySameEvent, mergeUnique, fetchAllGuatemalaEarthquakes } from '../mergedEarthquakeFetch';
import type { Earthquake } from '../../src/types';

function makeQuake(overrides: Partial<Earthquake> = {}): Earthquake {
  return {
    id: 'eq_1',
    magnitude: 4.5,
    place: 'Escuintla',
    time: 1700000000000,
    updated: 1700000000000,
    depth: 15,
    latitude: 14.3,
    longitude: -90.7,
    url: 'https://example.com',
    status: 'reviewed',
    tsunami: 0,
    sig: 300,
    ...overrides,
  };
}

describe('isLikelySameEvent', () => {
  it('matches two records for the same physical event (close in time and space)', () => {
    const usgs = makeQuake({ id: 'us1', time: 1700000000000, latitude: 14.3, longitude: -90.7 });
    const emsc = makeQuake({
      id: 'emsc_1',
      time: 1700000000000 + 60000, // 1 minute later — plausible reporting lag
      latitude: 14.35,
      longitude: -90.72, // a few km away — different epicenter estimate
    });
    expect(isLikelySameEvent(usgs, emsc)).toBe(true);
  });

  it('does not match events far apart in time (more than 5 minutes)', () => {
    const a = makeQuake({ time: 1700000000000 });
    const b = makeQuake({ time: 1700000000000 + 6 * 60 * 1000 });
    expect(isLikelySameEvent(a, b)).toBe(false);
  });

  it('does not match events far apart in location (more than 75km)', () => {
    const a = makeQuake({ latitude: 14.3, longitude: -90.7 });
    const b = makeQuake({ latitude: 15.5, longitude: -91.9 }); // >75km away
    expect(isLikelySameEvent(a, b)).toBe(false);
  });

  it('matches events with identical time and location', () => {
    const a = makeQuake({ time: 1700000000000, latitude: 14.3, longitude: -90.7 });
    const b = makeQuake({ time: 1700000000000, latitude: 14.3, longitude: -90.7 });
    expect(isLikelySameEvent(a, b)).toBe(true);
  });
});

describe('mergeUnique', () => {
  it('adds a candidate that matches nothing already in the combined list', () => {
    const combined = [makeQuake({ id: 'us1', latitude: 14.3, longitude: -90.7 })];
    const candidates = [makeQuake({ id: 'emsc1', latitude: 16.0, longitude: -92.0 })];
    const result = mergeUnique(combined, candidates);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id)).toEqual(['us1', 'emsc1']);
  });

  it('skips a candidate that matches an event already in the combined list', () => {
    const combined = [makeQuake({ id: 'us1', time: 1700000000000, latitude: 14.3, longitude: -90.7 })];
    const candidates = [makeQuake({ id: 'emsc1', time: 1700000000000 + 3000, latitude: 14.31, longitude: -90.71 })];
    const result = mergeUnique(combined, candidates);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('us1');
  });

  it('does not mutate the original combined array', () => {
    const combined = [makeQuake({ id: 'us1' })];
    mergeUnique(combined, [makeQuake({ id: 'emsc1', latitude: 20, longitude: -80 })]);
    expect(combined).toHaveLength(1);
  });
});

describe('fetchAllGuatemalaEarthquakes', () => {
  it('merges unique events from all three sources', async () => {
    const usgsQuake = makeQuake({ id: 'us1', latitude: 14.3, longitude: -90.7 });
    const emscQuake = makeQuake({ id: 'emsc1', latitude: 16.5, longitude: -92.5 }); // far from usgsQuake
    const insivumehQuake = makeQuake({ id: 'insivumeh_1', latitude: 15.0, longitude: -91.0 }); // far from both

    const result = await fetchAllGuatemalaEarthquakes({
      fetchUsgs: vi.fn().mockResolvedValue([usgsQuake]),
      fetchEmsc: vi.fn().mockResolvedValue([emscQuake]),
      fetchInsivumeh: vi.fn().mockResolvedValue(insivumehQuake),
    });

    expect(result.map((e) => e.id).sort()).toEqual(['emsc1', 'insivumeh_1', 'us1']);
  });

  it('deduplicates the same physical event reported by USGS and EMSC, keeping EMSC (higher priority)', async () => {
    const usgsQuake = makeQuake({ id: 'us1', time: 1700000000000, latitude: 14.3, longitude: -90.7 });
    const emscQuake = makeQuake({ id: 'emsc1', time: 1700000000000 + 5000, latitude: 14.32, longitude: -90.71 });

    const result = await fetchAllGuatemalaEarthquakes({
      fetchUsgs: vi.fn().mockResolvedValue([usgsQuake]),
      fetchEmsc: vi.fn().mockResolvedValue([emscQuake]),
      fetchInsivumeh: vi.fn().mockRejectedValue(new Error('scrape failed')),
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('emsc1');
  });

  it('follows EMSC > INSIVUMEH > USGS priority when all three report the same event', async () => {
    const usgsQuake = makeQuake({ id: 'us1', magnitude: 4.0, time: 1700000000000, latitude: 14.3, longitude: -90.7 });
    const emscQuake = makeQuake({ id: 'emsc1', magnitude: 4.2, time: 1700000000000 + 2000, latitude: 14.31, longitude: -90.71 });
    const insivumehQuake = makeQuake({ id: 'insivumeh_1', magnitude: 4.1, time: 1700000000000 + 4000, latitude: 14.29, longitude: -90.69 });

    const result = await fetchAllGuatemalaEarthquakes({
      fetchUsgs: vi.fn().mockResolvedValue([usgsQuake]),
      fetchEmsc: vi.fn().mockResolvedValue([emscQuake]),
      fetchInsivumeh: vi.fn().mockResolvedValue(insivumehQuake),
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('emsc1');
  });

  it('still returns EMSC and INSIVUMEH results when USGS fails', async () => {
    const emscQuake = makeQuake({ id: 'emsc1', latitude: 16.5, longitude: -92.5 });
    const insivumehQuake = makeQuake({ id: 'insivumeh_1', latitude: 15.0, longitude: -91.0 });

    const result = await fetchAllGuatemalaEarthquakes({
      fetchUsgs: vi.fn().mockRejectedValue(new Error('USGS down')),
      fetchEmsc: vi.fn().mockResolvedValue([emscQuake]),
      fetchInsivumeh: vi.fn().mockResolvedValue(insivumehQuake),
    });

    expect(result.map((e) => e.id).sort()).toEqual(['emsc1', 'insivumeh_1']);
  });

  it('returns an empty list without throwing when all three sources fail', async () => {
    const result = await fetchAllGuatemalaEarthquakes({
      fetchUsgs: vi.fn().mockRejectedValue(new Error('USGS down')),
      fetchEmsc: vi.fn().mockRejectedValue(new Error('EMSC down')),
      fetchInsivumeh: vi.fn().mockRejectedValue(new Error('INSIVUMEH down')),
    });

    expect(result).toEqual([]);
  });
});
