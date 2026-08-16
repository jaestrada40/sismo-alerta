import { describe, it, expect } from 'vitest';
import { earthquakeEmailSubject, earthquakeEmailText, earthquakeEmailHtml } from '../emailTemplates';
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
    url: 'https://earthquake.usgs.gov/event/1',
    status: 'reviewed',
    tsunami: 0,
    sig: 300,
    distanceToGuatemalaCityKm: 34,
    ...overrides,
  };
}

describe('earthquakeEmailSubject', () => {
  it('includes magnitude and place', () => {
    const subject = earthquakeEmailSubject(makeQuake({ magnitude: 5.2, place: 'Escuintla' }));
    expect(subject).toContain('5.2');
    expect(subject).toContain('Escuintla');
  });
});

describe('earthquakeEmailText', () => {
  it('includes the safety protocol and emergency numbers', () => {
    const text = earthquakeEmailText(makeQuake());
    expect(text).toContain('Agáchate');
    expect(text).toContain('Cúbrete');
    expect(text).toContain('Sujétate');
    expect(text).toContain('119 CONRED');
  });
});

describe('earthquakeEmailHtml', () => {
  it('produces well-formed HTML with the magnitude, place, and link', () => {
    const html = earthquakeEmailHtml(makeQuake({ magnitude: 5.2, place: 'Escuintla', url: 'https://example.com/eq/1' }));
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('5.2');
    expect(html).toContain('Escuintla');
    expect(html).toContain('https://example.com/eq/1');
    expect(html).toContain('Agáchate');
  });

  it('omits the distance row gracefully when distance is not available', () => {
    const html = earthquakeEmailHtml(makeQuake({ distanceToGuatemalaCityKm: undefined }));
    expect(html).not.toContain('Distancia a Ciudad de Guatemala');
  });

  it('uses a distinct alert color for severe magnitudes vs moderate', () => {
    const severe = earthquakeEmailHtml(makeQuake({ magnitude: 6.5 }));
    const moderate = earthquakeEmailHtml(makeQuake({ magnitude: 4.2 }));
    expect(severe).toContain('SEVERO');
    expect(moderate).toContain('MODERADO');
  });
});
