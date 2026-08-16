// server/emailService.ts
import nodemailer, { Transporter } from 'nodemailer';
import type { Earthquake } from '../src/types';

let transporter: Transporter | null = null;
let fromAddress: string = '';

export function configureEmailService(config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from?: string;
}): void {
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  fromAddress = config.from || config.user;
}

export function isEmailServiceConfigured(): boolean {
  return transporter !== null;
}

export async function sendEarthquakeEmail(to: string, earthquake: Earthquake): Promise<void> {
  if (!transporter) {
    console.warn('emailService: intento de envío sin configurar el servicio SMTP');
    return;
  }

  try {
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `Sismo M${earthquake.magnitude.toFixed(1)} · ${earthquake.place}`,
      text: `Se registró un sismo de magnitud ${earthquake.magnitude.toFixed(1)} en ${earthquake.place}.\n\nRevisa tu zona y sigue el protocolo de seguridad.\n\nMás información: https://earthquake.usgs.gov`,
      html: `<p>Se registró un sismo de magnitud <strong>${earthquake.magnitude.toFixed(1)}</strong> en <strong>${earthquake.place}</strong>.</p><p>Revisa tu zona y sigue el protocolo de seguridad.</p><p><a href="${earthquake.url}">Más información</a></p>`,
    });
  } catch (err: any) {
    console.warn('emailService: fallo enviando correo a', to, err.message);
  }
}
