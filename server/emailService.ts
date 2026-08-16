// server/emailService.ts
import nodemailer, { Transporter } from 'nodemailer';
import type { Earthquake } from '../src/types';
import { earthquakeEmailSubject, earthquakeEmailText, earthquakeEmailHtml } from './emailTemplates';

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
      subject: earthquakeEmailSubject(earthquake),
      text: earthquakeEmailText(earthquake),
      html: earthquakeEmailHtml(earthquake),
    });
  } catch (err: any) {
    console.warn('emailService: fallo enviando correo a', to, err.message);
  }
}
