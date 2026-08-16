<div align="center">

# 🌎 Alerta Sísmica Guatemala

**Monitoreo sísmico en tiempo real, notificaciones instantáneas y guía de emergencia para Guatemala.**

Datos en vivo de [USGS](https://earthquake.usgs.gov) · Notificaciones push y por correo · Reportes comunitarios · Funciona sin conexión

</div>

---

## ✨ Qué incluye

- 🗺️ **Mapa sísmico en tiempo real** con fallas tectónicas activas (Motagua, Chixoy-Polochic, Subducción de Cocos)
- 🔔 **Notificaciones instantáneas** vía Web Push y correo electrónico, con umbral de magnitud y radio "cerca de mí" configurables
- 👥 **Reportes comunitarios** ("¿Lo sentiste?") persistidos y compartidos entre usuarios
- 🎒 **Guía de emergencia y mochila de 72 horas**, disponible sin conexión (PWA instalable)
- 🤖 **Asesor sísmico con IA** para protocolos de seguridad y preguntas frecuentes
- 📋 **Generador de boletines** y simulador de alertas tempranas

## 🚀 Correr localmente

**Requisitos:** Node.js 20+

```bash
npm install
cp .env.example .env   # completa tus claves (VAPID, SMTP, GEMINI_API_KEY)
npm run dev
```

La app corre en `http://localhost:3000`.

### Variables de entorno

| Variable | Requerida para | Cómo obtenerla |
|---|---|---|
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Notificaciones push | `npx web-push generate-vapid-keys` |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Notificaciones por correo | Tu proveedor de correo (ej. Hostinger) |
| `GEMINI_API_KEY` | Asesor con IA | [Google AI Studio](https://ai.studio) |

Si alguna no está configurada, esa función se desactiva sin afectar al resto de la app.

## 🏗️ Producción

```bash
npm run build
npm start
```

También incluye un `Dockerfile` listo para desplegar en Coolify, Railway, Render o cualquier plataforma compatible con contenedores — ver la sección de despliegue más abajo.

## 🛠️ Stack

React 19 · Express · Vite · TypeScript · SQLite (better-sqlite3) · Web Push · Vitest
