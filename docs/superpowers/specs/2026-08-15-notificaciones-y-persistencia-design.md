# Alerta Sísmica Guatemala v3 — Notificaciones en tiempo real, persistencia y offline

## Contexto y motivación

La app actual (`alerta-sísmica-guatemala`) ya tiene mapa, feed de sismos (USGS), simulador,
asesor IA, reportes comunitarios y guía de emergencia. Sus limitaciones frente a la
competencia (ej. INSIVUMEH y otras apps con malas reseñas):

1. **Notificaciones tardías**: el feed solo se actualiza vía polling en el navegador cada
   45s, y únicamente mientras la pestaña está abierta. No hay forma de avisar a un usuario
   que no tiene la app abierta.
2. **Datos no persistentes**: los reportes comunitarios (`CommunityReports`) viven en
   `useState` de React — se pierden al refrescar y no se comparten entre usuarios.
3. **UX confusa en momentos de pánico**: la información importante (magnitud, distancia,
   qué hacer) está mezclada con texto denso.
4. **No funciona sin conexión**: la guía de emergencia y la mochila 72h, que son contenido
   estático, requieren red para cargar.

Este documento cubre las tres fases para resolverlo. Cada fase es incremental y
desplegable por separado.

## Alcance y no-alcance

- **Sí**: notificación push post-evento (en cuanto USGS publica el sismo, ~1-5 min después
  de ocurrido), persistencia de suscripciones/reportes, rediseño de UX de crisis, PWA
  offline para contenido estático.
- **No**: Earthquake Early Warning real (detección por sensores/acelerómetros antes de que
  llegue el sacudimiento) — requiere red física de sensores, fuera de alcance de una app
  web. Fuera de alcance de este documento.
- **Etapa**: prototipo/demo, sin usuarios reales todavía. Se prioriza simplicidad de
  infraestructura (SQLite embebido, sin proveedores externos) sobre escalabilidad.

## Fase 1 — Fundación: datos persistentes + notificaciones push

### Base de datos

Archivo SQLite local (`data.db`) vía `better-sqlite3`, sin servidor externo. Tablas:

- **`push_subscriptions`**: `endpoint`, `p256dh`, `auth`, `min_magnitude` (umbral elegido
  por el usuario), `nearby_radius_km` (opcional), `user_lat`/`user_lng` (opcional, para el
  cálculo de "cerca de mí"), `created_at`.
- **`seen_earthquakes`**: `usgs_id` (PK), `first_seen_at`. Evita re-notificar el mismo
  evento en ciclos de polling sucesivos.
- **`community_reports`**: mismas columnas que el tipo `CommunityReport` actual
  (`department`, `municipality`, `feltIntensity`, `buildingType`, `comments`, `timestamp`,
  `mercalliEstimated`), con `id` autogenerado.

### Job de vigilancia (server-side)

Corre dentro de `server.ts` (mismo proceso Express, `setInterval` cada 30s):

1. Reutiliza la lógica de `fetchLiveGuatemalaEarthquakes` (o una versión server-side del
   mismo fetch a USGS) con `timeframe: '24h'`.
2. Filtra los sismos cuyo `usgs_id` no está en `seen_earthquakes`.
3. Para cada sismo nuevo y cada suscripción: califica si `magnitude >= min_magnitude`, o
   si `nearby_radius_km` está configurado y la distancia al sismo es menor a ese radio
   (usando `calculateDistanceKm`, ya existente).
4. Envía Web Push (librería `web-push`, claves VAPID generadas una vez y guardadas en
   `.env`) a cada suscripción calificada. Payload: `{ title, body, earthquakeId, url }`.
5. Si el push devuelve error 410/404 (suscripción expirada), se borra esa fila de
   `push_subscriptions`.
6. Inserta el sismo en `seen_earthquakes`.
7. Si la llamada a USGS falla, se registra el error y se reintenta en el siguiente ciclo
   (no se detiene el servidor; mismo patrón de resiliencia que ya usa el frontend).

### Frontend

- **Service worker** (`public/sw.js`): registra el listener `push` y muestra la
  notificación del sistema operativo; el listener `notificationclick` abre/enfoca la app
  en la vista del sismo (`?eq=<id>`).
- **`NotificationSettings`** (nuevo componente): pide permiso de notificaciones, deja
  elegir el umbral de magnitud (slider, default 4.0) y activar/desactivar "avisarme si
  está cerca de mí" con radio configurable (usa `userCoords` ya existente en `App.tsx`).
  Al activar, registra el service worker, obtiene la `PushSubscription` del navegador y la
  envía a `POST /api/push/subscribe`.
- **`CommunityReports`**: pasa de estado local a `GET /api/reports` (carga inicial) y
  `POST /api/reports` (nuevo reporte). El estado en `App.tsx` sigue existiendo como cache
  cliente, pero la fuente de verdad es el backend.

### Nuevos endpoints en `server.ts`

- `POST /api/push/subscribe` — guarda/actualiza una suscripción
- `POST /api/push/unsubscribe` — borra por `endpoint`
- `GET /api/reports` — lista reportes comunitarios (más recientes primero)
- `POST /api/reports` — crea un reporte

## Fase 2 — UX de crisis

Objetivo: en 2 segundos, el usuario entiende magnitud, distancia, y qué hacer.

- **`AlertBanner`**: magnitud en tipografía grande (ya tiene estructura para esto),
  distancia a `userCoords` en la primera línea, y una sola acción concreta ("Agáchate,
  Cúbrete, Sujétate") sin párrafos de contexto — el detalle (fallas tectónicas, protocolo
  completo) se mueve a una sección expandible, no al primer vistazo.
- **Contenido de la notificación push**: título = `M{magnitud} · {lugar}`, cuerpo = una
  acción concreta según la fase del evento (ej. "Sismo confirmado — revisa tu zona").
  Tap → abre la app en `?eq=<id>`, que hace scroll/selecciona ese sismo en el feed.
- **Auditoría de texto denso**: revisar `EmergencyGuide` y el feed para mover explicaciones
  largas a expandibles, dejando la vista inicial de cada sección con lo esencial.

## Fase 3 — PWA offline

- **`manifest.json`**: nombre, iconos (usar los de `assets/`), `display: standalone`,
  `theme_color` acorde a la paleta actual (azul/rojo de alerta).
- **Service worker** (extiende el de Fase 1): estrategia cache-first para el shell de la
  app y contenido estático — `EmergencyGuide`, datos de la mochila 72h (`guatemalaData.ts`
  y componentes relacionados).
- **Datos en vivo** (feed, mapa): siguen requiriendo red; si no hay conexión, se muestra el
  último dato cacheado (ya existe el patrón de fallback local) con una indicación visible
  de "última actualización: hace X" en vez de fallar en silencio.
- Instalable vía "Agregar a inicio" gracias al manifest.

## Testing

- **Fase 1**: pruebas del job de vigilancia (dado un fixture de respuesta USGS con un
  sismo nuevo y uno ya visto, verificar que solo notifica el nuevo y solo a suscriptores
  calificados); pruebas de los endpoints REST (subscribe/unsubscribe/reports) contra la
  DB SQLite de test.
- **Fase 2**: verificación visual manual (no hay lógica compleja que testear
  automáticamente más allá de que el banner reciba y muestre los datos correctos).
- **Fase 3**: verificación manual de que la app carga sin red (DevTools → Offline) y que
  el contenido estático sigue disponible.

## Riesgos / decisiones abiertas

- **VAPID keys**: se generan una vez (`web-push generate-vapid-keys`) y se guardan en
  `.env` (ya existe `.env.example` en el repo, se añaden ahí las nuevas variables).
- **SQLite en prod**: válido para prototipo; si el proyecto pasa a tener usuarios reales,
  se evaluará migrar a Postgres gestionado — explícitamente fuera de alcance ahora.
