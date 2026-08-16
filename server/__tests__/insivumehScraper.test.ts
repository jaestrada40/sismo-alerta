import { describe, it, expect } from 'vitest';
import { parseUltimoSismoHtml, insivumehEventToEarthquake } from '../insivumehScraper';

// Trimmed fixture matching the real tooltip HTML structure INSIVUMEH's Folium-rendered
// /ULTIMO_SISMO page emits (captured 2026-08-16), with irrelevant map/marker code
// removed but the exact tooltip markup preserved verbatim.
const REAL_TOOLTIP_FIXTURE = `
        marker_e969f78c2dd5503d0e36d609969dcf10.bindTooltip(
            \`<div>
                 <h5><b>SISMO REGISTRADO</b>



<h5><b>Magnitud: </b>5.0



<h5><b>Tiempo de Origen: </b>2026-08-16 09:52:50

<h5><b>Latitud: </b>14.23546886

<h5><b>Longitud: </b>-93.07027435

<h5><b>Profundidad: </b>10.2 km

<h5><b>ID: </b>insivumeh2026pzyq




             </div>\`,
            {"sticky": true}
        );
`;

describe('parseUltimoSismoHtml', () => {
  it('extracts magnitude, time, coordinates, depth, and id from the real tooltip structure', () => {
    const event = parseUltimoSismoHtml(REAL_TOOLTIP_FIXTURE);
    expect(event).toEqual({
      magnitude: 5.0,
      originTime: '2026-08-16 09:52:50',
      latitude: 14.23546886,
      longitude: -93.07027435,
      depthKm: 10.2,
      id: 'insivumeh_insivumeh2026pzyq',
    });
  });

  it('throws when the page structure no longer matches (e.g. INSIVUMEH redesigned the page)', () => {
    expect(() => parseUltimoSismoHtml('<html><body>Página no encontrada</body></html>')).toThrow();
  });

  it('throws when only some fields are present (partial/corrupted response)', () => {
    const partial = '<h5><b>Magnitud: </b>5.0<h5><b>Latitud: </b>14.2';
    expect(() => parseUltimoSismoHtml(partial)).toThrow();
  });
});

describe('insivumehEventToEarthquake', () => {
  it('converts Guatemala local time (UTC-6) to the correct UTC epoch ms', () => {
    const eq = insivumehEventToEarthquake({
      magnitude: 5.0,
      originTime: '2026-08-16 09:52:50',
      latitude: 14.23546886,
      longitude: -93.07027435,
      depthKm: 10.2,
      id: 'insivumeh_insivumeh2026pzyq',
    });

    // 09:52:50 Guatemala local (UTC-6) == 15:52:50 UTC
    const expectedUtcMs = Date.UTC(2026, 7, 16, 15, 52, 50);
    expect(eq.time).toBe(expectedUtcMs);
  });

  it('prefixes the id and fills in department/intensity/distance via existing utilities', () => {
    const eq = insivumehEventToEarthquake({
      magnitude: 5.0,
      originTime: '2026-08-16 09:52:50',
      latitude: 14.23546886,
      longitude: -93.07027435,
      depthKm: 10.2,
      id: 'insivumeh_insivumeh2026pzyq',
    });

    expect(eq.id).toBe('insivumeh_insivumeh2026pzyq');
    expect(eq.magnitude).toBe(5.0);
    expect(eq.department).toBeTruthy();
    expect(eq.intensityMercalli).toBeTruthy();
    expect(eq.distanceToGuatemalaCityKm).toBeGreaterThan(0);
    expect(eq.url).toBe('https://geo.insivumeh.gob.gt/ULTIMO_SISMO');
  });
});
