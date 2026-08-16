import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

import {
  initDb,
  deleteSubscriptionByEndpoint,
  hasSeenEarthquake,
  markEarthquakeSeen,
  getAllSubscriptions,
  getAllEmailSubscriptions,
} from './server/db';
import { registerApiRoutes } from './server/routes';
import { pollAndNotify } from './server/seismicWatcher';
import { fetchLatestGuatemalaEarthquakes } from './server/usgsServerFetch';
import { configurePushService, sendEarthquakePush } from './server/pushService';
import { configureEmailService, sendEarthquakeEmail, isEmailServiceConfigured } from './server/emailService';

const app = express();
const PORT = 3000;

app.use(express.json());

const db = initDb(process.env.DB_PATH || 'data.db');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    configurePushService(process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  } catch (err: any) {
    console.warn('No se pudo configurar el servicio de push (claves VAPID inválidas), push desactivado:', err.message);
  }
}

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    configureEmailService({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE !== 'false',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM,
    });
  } catch (err: any) {
    console.warn('No se pudo configurar el servicio de correo (credenciales SMTP inválidas), correo desactivado:', err.message);
  }
}

registerApiRoutes(app, db);

// Earthquake watcher: polls USGS every 30s and notifies qualifying subscribers via push and/or email.
setInterval(() => {
  pollAndNotify({
    db,
    fetchQuakes: fetchLatestGuatemalaEarthquakes,
    sendPush: (sub, eq) => sendEarthquakePush(sub, eq, (endpoint) => deleteSubscriptionByEndpoint(db, endpoint)),
    hasSeenEarthquake,
    markEarthquakeSeen,
    getAllSubscriptions,
    ...(isEmailServiceConfigured()
      ? {
          sendEmail: (sub, eq) => sendEarthquakeEmail(sub.email, eq),
          getAllEmailSubscriptions,
        }
      : {}),
  });
}, 30000);

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), country: 'Guatemala' });
});

// Gemini AI Assistant for seismic advice, protocol explanation, and structural safety
app.post('/api/seismic-ai-advice', async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'La pregunta es requerida' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // High-quality contextual response if GEMINI_API_KEY is not set
      const defaultAdvice = generateLocalSeismicAdvice(question, context);
      return res.json({ response: defaultAdvice, source: 'local_expert' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `Eres el Asistente Experto en Sismología y Gestión de Riesgos de Guatemala (CONRED e INSIVUMEH).
Tu misión es educar, dar instrucciones claras de protección ante sismos y terremotos en Guatemala, explicar fallas tectónicas (Falla de Motagua, Chixoy-Polochic, Jalpatagua, Zona de Subducción de la Placa de Cocos) y asesorar sobre la Mochila de las 72 horas y planes familiares de respuesta.
Tus respuestas deben ser calmadas, claras, precisas, en español guatemalteco educado y con recomendaciones prácticas que salvan vidas.`;

    const prompt = `Contexto actual: ${JSON.stringify(context || {})}
Pregunta del usuario: ${question}

Proporciona una respuesta concisa, empática y con pasos numerados o viñetas claras si corresponde.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 600
      }
    });

    return res.json({
      response: response.text || 'Mantenga la calma y siga las instrucciones de CONRED.',
      source: 'gemini'
    });
  } catch (error: any) {
    console.error('Error en Gemini AI:', error);
    const fallback = generateLocalSeismicAdvice(req.body.question, req.body.context);
    return res.json({ response: fallback, source: 'local_expert' });
  }
});

function generateLocalSeismicAdvice(question: string, context?: any): string {
  const q = (question || '').toLowerCase();
  
  if (q.includes('mochila') || q.includes('72 horas') || q.includes('preparar')) {
    return `🎒 **Guía de la Mochila de las 72 Horas (CONRED Guatemala)**:\n\n1. **Agua potable**: Al menos 2 litros por persona al día.\n2. **Alimentos no perecederos**: Enlatados con abre fácil, barras energéticas, frutos secos.\n3. **Botiquín de primeros auxilios**: Con medicamentos habituales para familiares con tratamientos.\n4. **Linterna y radio portátil** a baterías con repuestos (no use velas tras un sismo).\n5. **Silbato de emergencia**: Clave para ser ubicado bajo escombros.\n6. **Documentos importantes**: Copias de DPI, escrituras en bolsa plástica hermética y memoria USB.\n7. **Dinero en efectivo** en denominaciones pequeñas (Q5, Q10, Q20).`;
  }
  
  if (q.includes('durante') || q.includes('que hacer') || q.includes('qué hacer') || q.includes('tiembla')) {
    return `🚨 **Protocolo de Protección DURANTE un Sismo**:\n\n1. **¡Agáchate, Cúbrete y Sujétate!**: Colócate debajo de una mesa resistente o junto a un mueble sólido.\n2. **Aléjate de ventanas, espejos y repisas** que puedan quebrarse y caer.\n3. **No uses elevadores** ni escaleras mientras dura el movimiento.\n4. **Si estás en la calle**: Aléjate de postes de tendido eléctrico, muros de adobe y fachadas de edificios.\n5. **Si conduces**: Reduce la velocidad gradualmente y detente en un lugar seguro lejos de puentes o pasos a desnivel.`;
  }

  if (q.includes('falla') || q.includes('motagua') || q.includes('polochic') || q.includes('placas')) {
    return `🗺️ **Geología y Fallas Sísmicas en Guatemala**:\n\nGuatemala está ubicada sobre tres placas tectónicas mayores: **Norteamérica, Caribe y Cocos**.\n- **Falla de Motagua**: Límite transformante entre Norteamérica y Caribe; causó el terremoto del 4 de febrero de 1976 (M7.5).\n- **Falla de Chixoy-Polochic**: Sistema activo paralelo al norte.\n- **Zona de Subducción**: En la costa del Pacífico (Placa de Cocos hundiéndose bajo el Caribe), responsable de la mayoría de sismos profundos y eventos de gran magnitud.`;
  }

  return `✅ **Recomendaciones Generales de Seguridad Sísmica**:\n\n1. Conserve la calma; no corra ni empuje.\n2. Cierre llaves de gas y baje los interruptores de luz si hay sospecha de daños.\n3. Comuníquese por mensajes de texto o redes para no saturar las líneas telefónicas.\n4. En caso de emergencias graves en Guatemala, llame al **119 de CONRED** o **122 / 123 de Bomberos**.`;
}

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Alerta Sísmica Guatemala corriendo en el puerto ${PORT}`);
  });
}

startServer();
