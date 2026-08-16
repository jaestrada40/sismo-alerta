// server/emailTemplates.ts
//
// Email HTML must be inline-styled table markup — email clients (especially
// Outlook) don't support external stylesheets, Flexbox/Grid, or most modern CSS.
// Colors mirror the app's own palette (blue-900 header, red alert accents).
import type { Earthquake } from '../src/types';

function alertLevelColor(magnitude: number): { bg: string; label: string } {
  if (magnitude >= 6.0) return { bg: '#b91c1c', label: 'SEVERO' };
  if (magnitude >= 5.0) return { bg: '#c2410c', label: 'FUERTE' };
  if (magnitude >= 4.0) return { bg: '#b45309', label: 'MODERADO' };
  return { bg: '#1e3a8a', label: 'LEVE' };
}

export function earthquakeEmailSubject(earthquake: Earthquake): string {
  return `🚨 Sismo M${earthquake.magnitude.toFixed(1)} · ${earthquake.place}`;
}

export function earthquakeEmailText(earthquake: Earthquake): string {
  const distance = earthquake.distanceToGuatemalaCityKm
    ? `A ${Math.round(earthquake.distanceToGuatemalaCityKm)} km de Ciudad de Guatemala. `
    : '';
  return `ALERTA SÍSMICA GUATEMALA

Sismo de magnitud ${earthquake.magnitude.toFixed(1)} registrado en ${earthquake.place}.
${distance}Profundidad: ${earthquake.depth} km.

Qué hacer ahora:
1. Agáchate
2. Cúbrete
3. Sujétate

Aléjate de ventanas y objetos que puedan caer. Si estás en la calle, aléjate de postes y fachadas.

Más información: ${earthquake.url}

En caso de emergencia: 119 CONRED · 122/123 Bomberos`;
}

export function earthquakeEmailHtml(earthquake: Earthquake): string {
  const { bg: alertColor, label: alertLabel } = alertLevelColor(earthquake.magnitude);
  const distanceRow = earthquake.distanceToGuatemalaCityKm
    ? `<tr>
         <td style="padding:4px 0;color:#64748b;font-size:13px;">Distancia a Ciudad de Guatemala</td>
         <td style="padding:4px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${Math.round(earthquake.distanceToGuatemalaCityKm)} km</td>
       </tr>`
    : '';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <tr>
            <td style="background-color:#1e3a8a;padding:16px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#ffffff;font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                    🌎 Alerta Sísmica Guatemala
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:${alertColor};padding:8px 24px;">
              <span style="color:#ffffff;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                Nivel ${alertLabel}
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 8px 24px;">
              <div style="font-size:44px;font-weight:900;color:#0f172a;line-height:1;">
                M ${earthquake.magnitude.toFixed(1)}
              </div>
              <div style="font-size:16px;font-weight:700;color:#1e293b;margin-top:8px;">
                ${earthquake.place}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:8px 24px 0 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:12px;">
                <tr>
                  <td style="padding:4px 0;color:#64748b;font-size:13px;">Profundidad</td>
                  <td style="padding:4px 0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${earthquake.depth} km</td>
                </tr>
                ${distanceRow}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="color:#991b1b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                      Qué hacer ahora
                    </div>
                    <div style="color:#7f1d1d;font-size:14px;font-weight:700;line-height:1.6;">
                      1. Agáchate &nbsp;·&nbsp; 2. Cúbrete &nbsp;·&nbsp; 3. Sujétate
                    </div>
                    <div style="color:#991b1b;font-size:12px;margin-top:6px;">
                      Aléjate de ventanas y objetos que puedan caer.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px 24px 24px;" align="center">
              <a href="${earthquake.url}" style="display:inline-block;background-color:#1e3a8a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;">
                Ver más información
              </a>
            </td>
          </tr>

          <tr>
            <td style="background-color:#0f172a;padding:16px 24px;">
              <div style="color:#94a3b8;font-size:11px;line-height:1.6;">
                Emergencias: <strong style="color:#fbbf24;">119 CONRED</strong> &nbsp;·&nbsp;
                <strong style="color:#f87171;">122/123 Bomberos</strong>
              </div>
              <div style="color:#64748b;font-size:10px;margin-top:8px;">
                Alerta Sísmica Guatemala — notificación automática basada en USGS/INSIVUMEH.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
