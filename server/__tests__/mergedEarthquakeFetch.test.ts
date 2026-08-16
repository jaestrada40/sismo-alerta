import { describe, it, expect } from 'vitest';
import { isLikelySameEvent } from '../mergedEarthquakeFetch';
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
    const insivumeh = makeQuake({
      id: 'insivumeh_1',
      time: 1700000000000 + 60000, // 1 minute later — plausible reporting lag
      latitude: 14.35,
      longitude: -90.72, // a few km away — different epicenter estimate
    });
    expect(isLikelySameEvent(usgs, insivumeh)).toBe(true);
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
