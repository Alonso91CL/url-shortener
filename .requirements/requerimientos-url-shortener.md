**DOCUMENTO DE REQUERIMIENTOS**

URL Shortener con Analytics

_Proyecto de Portafolio - Fullstack Developer_

| **Versión** | 1.0.0                                                  |
| ----------- | ------------------------------------------------------ |
| **Fecha**   | Abril 2026                                             |
| **Stack**   | Astro + React + Node.js + Express + PostgreSQL + Redis |
| **Estado**  | En definicion                                          |

# **1\. Introducción**

## **1.1 Descripción general**

URL Shortener con Analytics es una aplicación web fullstack que permite a los usuarios acortar URLs largas, compartirlas y obtener métricas detalladas sobre su rendimiento: cantidad de clics, dispositivos, países de origen y referrers. El proyecto está diseñado como pieza central de portafolio, demostrando dominio end-to-end desde la arquitectura de API hasta la presentación de datos en el frontend.

## **1.2 Objetivos del proyecto**

- Construir una aplicación funcional y desplegable que demuestre capacidades fullstack reales.
- Implementar un pipeline de analytics asíncrono que no impacte la latencia del redirect.
- Aplicar patrones modernos de arquitectura: caché con Redis, jobs con BullMQ, ORM con Prisma.
- Entregar un frontend con Astro + React islands, demostrando conocimiento de rendering selectivo.
- Documentar el proyecto con un README de calidad profesional y despliegue en un entorno real.

## **1.3 Alcance**

El sistema incluye:

- Acortado de URLs con código alfanumérico de 6 caracteres.
- Redirección HTTP con latencia menor a 20ms vía caché.
- Dashboard de analytics por enlace: clics totales, clics por día, dispositivos, países, referrers top.
- Autenticación de usuarios para gestionar sus propios enlaces.
- API REST documentada con OpenAPI/Swagger.
- Entorno de desarrollo completamente dockerizado.

El sistema NO incluye en esta versión:

- Acortado de URLs con dominio personalizado (vanity domains).
- Planes de pago o billing.
- Integración con servicios de terceros como Zapier o Slack.
- App móvil nativa.

# **2\. Requerimientos funcionales**

## **2.1 Gestión de usuarios**

| **ID**   | **Descripción**                                                         | **Prioridad** |
| -------- | ----------------------------------------------------------------------- | ------------- |
| RF-US-01 | El usuario puede registrarse con email y contraseña.                    | Alta          |
| RF-US-02 | El usuario puede iniciar sesión y obtener un JWT con expiración de 24h. | Alta          |
| RF-US-03 | El usuario puede cerrar sesión, invalidando su token en el cliente.     | Alta          |
| RF-US-04 | El usuario puede ver y editar su perfil (nombre, contraseña).           | Media         |
| RF-US-05 | Las contraseñas se almacenan con hash bcrypt de coste mínimo 12.        | Alta          |

## **2.2 Acortado de URLs**

| **ID**    | **Descripción**                                                                                             | **Prioridad** |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------- |
| RF-URL-01 | El usuario autenticado puede crear un enlace corto proporcionando una URL larga.                            | Alta          |
| RF-URL-02 | El sistema genera un código alfanumérico único de 6 caracteres (Base62).                                    | Alta          |
| RF-URL-03 | El usuario puede asignar un alias personalizado al enlace (máx. 20 caracteres, solo alfanumérico y guion).  | Media         |
| RF-URL-04 | El usuario puede definir una fecha de expiración opcional para el enlace.                                   | Media         |
| RF-URL-05 | El usuario puede activar o desactivar un enlace en cualquier momento.                                       | Alta          |
| RF-URL-06 | El usuario puede eliminar sus propios enlaces. Los registros de analytics asociados se eliminan en cascada. | Alta          |
| RF-URL-07 | El sistema valida que la URL ingresada tenga formato válido (protocolo http/https requerido).               | Alta          |
| RF-URL-08 | El usuario puede listar todos sus enlaces con paginación de 20 por página.                                  | Alta          |

## **2.3 Redirección**

| **ID**   | **Descripción**                                                                                         | **Prioridad** |
| -------- | ------------------------------------------------------------------------------------------------------- | ------------- |
| RF-RD-01 | Al acceder a /:code el sistema redirige al usuario a la URL original con HTTP 301 o 302.                | Alta          |
| RF-RD-02 | Se usa 302 por defecto para preservar el tracking. El tipo de redirect es configurable por enlace.      | Media         |
| RF-RD-03 | Si el enlace no existe, el sistema responde con una página 404 amigable.                                | Alta          |
| RF-RD-04 | Si el enlace está desactivado o expirado, se muestra una página de enlace inactivo.                     | Alta          |
| RF-RD-05 | El redirect se resuelve en menos de 20ms usando caché Redis. Solo va a Postgres en caso de cache miss.  | Alta          |
| RF-RD-06 | Cada redirect dispara de forma asíncrona el registro de un evento de click en la cola de procesamiento. | Alta          |

## **2.4 Analytics**

| **ID**   | **Descripción**                                                                                                                                                            | **Prioridad** |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| RF-AN-01 | Para cada click se registran: timestamp, IP (hasheada), user-agent parseado (dispositivo, OS, navegador), country/city por geolocalización IP, referer y código de enlace. | Alta          |
| RF-AN-02 | El dashboard muestra el total de clics de un enlace desde su creación.                                                                                                     | Alta          |
| RF-AN-03 | El dashboard muestra una serie temporal de clics agrupados por día, con rango configurable (7, 30, 90 días).                                                               | Alta          |
| RF-AN-04 | El dashboard muestra distribución de clics por tipo de dispositivo: desktop, mobile, tablet, bot.                                                                          | Alta          |
| RF-AN-05 | El dashboard muestra los 10 países con más clics, con código de país ISO.                                                                                                  | Alta          |
| RF-AN-06 | El dashboard muestra los 10 referrers con más clics. Clics directos se agrupan como 'directo'.                                                                             | Media         |
| RF-AN-07 | El dashboard muestra los 5 navegadores con más clics.                                                                                                                      | Baja          |
| RF-AN-08 | Los datos de analytics se actualizan con un retraso máximo de 5 segundos desde el click (procesamiento async).                                                             | Alta          |
| RF-AN-09 | El usuario solo puede ver analytics de sus propios enlaces.                                                                                                                | Alta          |

# **3\. Requerimientos no funcionales**

## **3.1 Rendimiento**

- El endpoint de redirect (GET /:code) debe responder en menos de 20ms en p95 con caché caliente.
- El endpoint de redirect debe responder en menos de 80ms en p95 con cache miss (ida a Postgres).
- La API REST debe responder en menos de 200ms en p95 para operaciones CRUD estándar.
- El procesador de clicks (BullMQ worker) debe procesar un evento en menos de 500ms.
- El sistema debe soportar 100 redirects/segundo concurrentes sin degradación en un servidor de 2 vCPUs.

## **3.2 Seguridad**

- Todas las contraseñas se hashean con bcrypt (cost factor >= 12).
- Las IPs de los visitantes se almacenan hasheadas con SHA-256 + salt para cumplir con privacidad.
- Los endpoints privados requieren JWT válido en header Authorization: Bearer &lt;token&gt;.
- Se aplica rate limiting en el endpoint de creación de enlaces: 10 por minuto por usuario.
- Se aplica rate limiting en el endpoint de registro: 5 intentos por IP por hora.
- Todos los inputs de usuario son validados con Zod antes de ser procesados.
- La API retorna errores genéricos en producción, sin exponer stack traces.
- Las variables de entorno sensibles (DATABASE_URL, JWT_SECRET, REDIS_URL) nunca se comitean al repositorio.

## **3.3 Disponibilidad y operación**

- El sistema debe estar disponible 99% del tiempo en el entorno de producción (objetivo portafolio).
- Todos los servicios se levantan con un solo comando: docker-compose up.
- Las migraciones de base de datos se ejecutan automáticamente al iniciar el contenedor de API.
- Los logs de la aplicación se escriben en formato JSON estructurado para facilitar su análisis.
- El sistema incluye health check endpoints: GET /health para la API y GET / para el frontend.

## **3.4 Mantenibilidad**

- El código de la API sigue una arquitectura en capas: router → controller → service → repository.
- El frontend separa páginas Astro (estáticas) de islands React (interactivas).
- Cobertura de tests unitarios mínima del 60% en la capa de servicios del backend.
- El proyecto incluye linting con ESLint y formateo con Prettier configurados en pre-commit hooks.
- El README documenta cómo levantar el proyecto, variables de entorno requeridas y estructura de carpetas.

## **3.5 Usabilidad**

- El frontend es responsive y funcional en pantallas desde 375px de ancho.
- El tiempo de carga inicial del dashboard (First Contentful Paint) es menor a 1.5s en red 4G simulada.
- Los errores de formulario se muestran inline con mensajes en español, claros y accionables.
- El código corto se puede copiar al portapapeles con un solo click desde cualquier vista.

# **4\. Arquitectura del sistema**

## **4.1 Visión general**

El sistema está compuesto por cuatro servicios orquestados con Docker Compose:

| **Servicio** | **Tecnología**             | **Puerto** | **Responsabilidad**                        |
| ------------ | -------------------------- | ---------- | ------------------------------------------ |
| frontend     | Astro 4 + Tailwind + React | 4321       | Páginas estáticas e islands interactivas   |
| api          | Node.js 20 + Express 5     | 3000       | API REST, redirect engine, worker BullMQ   |
| postgres     | PostgreSQL 16              | 5432       | Persistencia de usuarios, links y clicks   |
| redis        | Redis 7                    | 6379       | Caché de redirects + broker de cola BullMQ |

## **4.2 Flujo de redirect (camino crítico)**

El flujo de un click en un enlace corto sigue estos pasos en orden:

- El usuario accede a GET /:code en el servicio de frontend (Astro en SSR mode).
- Astro hace forward de la petición al servicio de API en GET /r/:code.
- La API consulta Redis con la clave link:{code}. Si existe (cache hit), obtiene la URL en < 2ms.
- Si no existe en Redis (cache miss), consulta PostgreSQL. Si el link existe y está activo, guarda en Redis con TTL de 1 hora.
- La API responde HTTP 302 con header Location: &lt;url_original&gt;.
- De forma asíncrona (fire-and-forget), la API encola un job en BullMQ con los metadatos del click.
- El worker de BullMQ procesa el job: parsea user-agent, geolocaliza la IP hasheada y persiste en la tabla clicks de Postgres.

_Los pasos 1-5 ocurren en el critical path del usuario. El paso 6 es una operación non-blocking. Los pasos 6-7 ocurren de forma completamente asíncrona sin impactar el tiempo de respuesta del redirect._

## **4.3 Estructura de carpetas**

El monorepo sigue la siguiente estructura:

url-shortener/ apps/ frontend/ # Astro + Tailwind + React islands src/ pages/ # index.astro, \[code\].astro, dashboard.astro components/ # ShortenerForm.tsx, AnalyticsChart.tsx, LinkTable.tsx layouts/ # BaseLayout.astro astro.config.mjs tailwind.config.cjs api/ # Express + BullMQ src/ routes/ # links.ts, redirect.ts, stats.ts, auth.ts controllers/ # linksController.ts, statsController.ts services/ # linkService.ts, analyticsService.ts, authService.ts workers/ # clickProcessor.ts lib/ # cache.ts, queue.ts, geo.ts, hash.ts middleware/ # auth.ts, rateLimit.ts, validate.ts db/ # prisma.ts prisma/ schema.prisma migrations/ docker-compose.yml docker-compose.prod.yml .env.example README.md

# **5\. Modelo de datos**

## **5.1 Tabla users**

| **Campo**     | **Tipo**     | **Nullable** | **Descripción**                                     |
| ------------- | ------------ | ------------ | --------------------------------------------------- |
| id            | UUID (PK)    | No           | Identificador único, generado con gen_random_uuid() |
| email         | VARCHAR(255) | No           | Email único del usuario, indexed                    |
| password_hash | VARCHAR(60)  | No           | Hash bcrypt de la contraseña                        |
| name          | VARCHAR(100) | Sí           | Nombre de display del usuario                       |
| created_at    | TIMESTAMPTZ  | No           | Fecha de registro, default NOW()                    |
| updated_at    | TIMESTAMPTZ  | No           | Última actualización, auto-updated                  |

## **5.2 Tabla links**

| **Campo**     | **Tipo**    | **Nullable** | **Descripción**                              |
| ------------- | ----------- | ------------ | -------------------------------------------- |
| id            | UUID (PK)   | No           | Identificador único                          |
| code          | VARCHAR(20) | No           | Código único del enlace corto, indexed único |
| original_url  | TEXT        | No           | URL de destino completa                      |
| user_id       | UUID (FK)   | No           | Referencia a users.id con ON DELETE CASCADE  |
| is_active     | BOOLEAN     | No           | Estado del enlace, default true              |
| redirect_type | SMALLINT    | No           | 301 o 302, default 302                       |
| expires_at    | TIMESTAMPTZ | Sí           | Fecha de expiración opcional                 |
| created_at    | TIMESTAMPTZ | No           | Fecha de creación, default NOW()             |
| updated_at    | TIMESTAMPTZ | No           | Última actualización                         |

## **5.3 Tabla clicks**

| **Campo**   | **Tipo**       | **Nullable** | **Descripción**                                |
| ----------- | -------------- | ------------ | ---------------------------------------------- |
| id          | BIGSERIAL (PK) | No           | ID secuencial para volumen alto de inserciones |
| link_id     | UUID (FK)      | No           | Referencia a links.id con ON DELETE CASCADE    |
| clicked_at  | TIMESTAMPTZ    | No           | Timestamp exacto del click, indexed            |
| ip_hash     | VARCHAR(64)    | No           | SHA-256 de la IP + salt (privacidad)           |
| country     | CHAR(2)        | Sí           | Código ISO-3166-1 alpha-2 del país             |
| city        | VARCHAR(100)   | Sí           | Ciudad detectada por GeoIP                     |
| device_type | VARCHAR(20)    | Sí           | desktop, mobile, tablet, bot                   |
| os          | VARCHAR(50)    | Sí           | Windows, macOS, Linux, iOS, Android, etc.      |
| browser     | VARCHAR(50)    | Sí           | Chrome, Firefox, Safari, Edge, etc.            |
| referer     | TEXT           | Sí           | URL de origen. NULL indica acceso directo      |

_La tabla clicks se espera que crezca considerablemente. Se recomienda crear índices compuestos en (link_id, clicked_at) para las queries de analytics por rango de fechas, y un índice en (link_id, country) para las queries de distribución geográfica._

# **6\. API REST**

## **6.1 Convenciones generales**

- Base URL en desarrollo: <http://localhost:3000/api/v1>
- Todos los endpoints retornan JSON con Content-Type: application/json.
- Los errores siguen el formato: { error: string, code: string, details?: object }.
- La paginación usa query params: ?page=1&limit=20. La respuesta incluye { data, meta: { total, page, limit, totalPages } }.
- Los endpoints autenticados requieren header Authorization: Bearer &lt;jwt_token&gt;.

## **6.2 Endpoints de autenticación**

| **Método** | **Endpoint**          | **Descripción**                                             | **Auth** |
| ---------- | --------------------- | ----------------------------------------------------------- | -------- |
| **POST**   | /api/v1/auth/register | Registro de usuario nuevo. Body: { email, password, name? } | No       |
| **POST**   | /api/v1/auth/login    | Login. Retorna { token, user }. Body: { email, password }   | No       |
| **GET**    | /api/v1/auth/me       | Retorna datos del usuario autenticado.                      | Sí       |
| **PUT**    | /api/v1/auth/me       | Actualiza nombre o contraseña del usuario.                  | Sí       |

## **6.3 Endpoints de links**

| **Método** | **Endpoint**        | **Descripción**                                                                    | **Auth** |
| ---------- | ------------------- | ---------------------------------------------------------------------------------- | -------- |
| **GET**    | /api/v1/links       | Lista paginada de links del usuario autenticado.                                   | Sí       |
| **POST**   | /api/v1/links       | Crea un nuevo link corto. Body: { originalUrl, alias?, expiresAt?, redirectType? } | Sí       |
| **GET**    | /api/v1/links/:code | Obtiene detalles de un link específico.                                            | Sí       |
| **PATCH**  | /api/v1/links/:code | Actualiza isActive, redirectType o expiresAt de un link.                           | Sí       |
| **DELETE** | /api/v1/links/:code | Elimina un link y sus clicks en cascada.                                           | Sí       |
| **GET**    | /r/:code            | Redirect al destino. No requiere auth. Es el endpoint de máximo rendimiento.       | No       |

## **6.4 Endpoints de analytics**

| **Método** | **Endpoint**                   | **Descripción**                                                                         | **Auth** |
| ---------- | ------------------------------ | --------------------------------------------------------------------------------------- | -------- |
| **GET**    | /api/v1/stats/:code/overview   | Total de clics, clics únicos (por ip_hash), fecha del primer y último click.            | Sí       |
| **GET**    | /api/v1/stats/:code/timeseries | Clics por día. Query param: ?days=7\|30\|90. Retorna array de { date, clicks }.         | Sí       |
| **GET**    | /api/v1/stats/:code/devices    | Distribución de clics por device_type. Retorna array de { device, clicks, percentage }. | Sí       |
| **GET**    | /api/v1/stats/:code/countries  | Top 10 países por clicks. Retorna array de { country, clicks, percentage }.             | Sí       |
| **GET**    | /api/v1/stats/:code/referrers  | Top 10 referrers. Retorna array de { referer, clicks, percentage }.                     | Sí       |
| **GET**    | /api/v1/stats/:code/browsers   | Top 5 navegadores. Retorna array de { browser, clicks, percentage }.                    | Sí       |

# **7\. Frontend - Astro + React islands**

## **7.1 Estrategia de rendering**

El frontend usa Astro como framework base con la filosofía de islands architecture. La regla es simple: todo lo que no necesita interactividad en el cliente se renderiza como HTML estático en el servidor (o en build time). Solo se hidratan con React los componentes que requieren estado o eventos del usuario.

| **Página / Componente** | **Tipo**                   | **Razón**                                   |
| ----------------------- | -------------------------- | ------------------------------------------- |
| index.astro             | Astro estático             | Landing sin interactividad dinámica         |
| dashboard.astro         | Astro SSR                  | Requiere auth server-side + datos iniciales |
| \[code\].astro          | Astro SSR                  | Verifica estado del link en servidor        |
| ShortenerForm.tsx       | React island (client:load) | Estado del formulario + submit async        |
| LinkTable.tsx           | React island (client:load) | Filtros, paginación, acciones inline        |
| AnalyticsChart.tsx      | React island (client:load) | Gráficos interactivos con Recharts          |
| CopyButton.tsx          | React island (client:idle) | Solo necesita el evento click               |
| StatsOverview.tsx       | React island (client:load) | Fetching de stats + actualización polling   |

## **7.2 Páginas**

### **/ - Landing page**

- Formulario central de acortado de URL (React island).
- Si el usuario está autenticado, el enlace creado se asocia a su cuenta.
- Si no está autenticado, el enlace se crea como anónimo (sin analytics ni gestión).
- Hero con copy claro y ejemplo animado del flujo de acortado.
- Sección de features destacando analytics y privacidad.

### **/dashboard - Panel principal**

- Requiere autenticación. Redirige a /login si no hay sesión.
- Tabla paginada de todos los links del usuario con columnas: code, URL original (truncada), clics totales, estado, fecha de creación, acciones.
- Botón de crear nuevo link que abre un modal con el formulario completo.
- Cada fila tiene acción de copiar, ver analytics, editar y eliminar.

### **/dashboard/:code - Analytics de un link**

- Header con el link corto, URL de destino, estado y fecha de creación.
- Cards de métricas: total clics, clics únicos, clics hoy, países distintos.
- Gráfico de línea de clics por día (selector de rango: 7, 30, 90 días).
- Gráfico de donut de distribución por dispositivo.
- Tabla de top países con bandera y barra de progreso visual.
- Tabla de top referrers.

### **/login y /register**

- Formularios simples de autenticación.
- Validación inline con mensajes de error claros.
- Redirige al dashboard tras login/registro exitoso.

# **8\. Plan de desarrollo**

## **8.1 Fases**

| **Fase** | **Nombre**                | **Entregables**                                                                         | **Duración** |
| -------- | ------------------------- | --------------------------------------------------------------------------------------- | ------------ |
| 1        | **Infraestructura base**  | docker-compose funcional, Prisma schema + migraciones, Express boilerplate, Astro setup | 2 días       |
| 2        | **Core de la API**        | Auth completo (register/login/me), CRUD de links, redirect engine con Redis             | 3 días       |
| 3        | **Pipeline de analytics** | BullMQ worker, geolocalización, user-agent parsing, todos los endpoints de stats        | 3 días       |
| 4        | **Frontend**              | Landing, dashboard, tabla de links, página de analytics con todos los gráficos          | 4 días       |
| 5        | **Pulido y despliegue**   | Tests unitarios, documentación Swagger, README, deploy en Railway/Render                | 2 días       |

## **8.2 Orden recomendado de implementación**

Dentro de cada fase, seguir este orden para tener feedback rápido en cada iteración:

- Levantar docker-compose con postgres y redis. Verificar conexiones.
- Crear schema de Prisma y ejecutar primera migración.
- Implementar auth (register + login) con tests manuales en Bruno/Postman.
- Implementar CRUD de links. Verificar validaciones con Zod.
- Implementar el redirect engine. Medir latencia con curl -w "Time: %{time_total}".
- Integrar Redis al redirect. Verificar cache hits con redis-cli MONITOR.
- Implementar BullMQ queue y worker básico (solo log por ahora).
- Agregar parsing de user-agent y geolocalización al worker.
- Implementar todos los endpoints de stats y probarlos con datos reales.
- Construir el frontend: layout base y landing.
- Implementar dashboard con tabla de links.
- Implementar página de analytics con gráficos.
- Agregar tests, Swagger y README.
- Deploy.

# **9\. Variables de entorno**

El archivo .env.example en la raíz del proyecto debe incluir todas las variables necesarias. Nunca se comitea el archivo .env real.

| **Variable**         | **Ejemplo**                                    | **Descripción**                    |
| -------------------- | ---------------------------------------------- | ---------------------------------- |
| DATABASE_URL         | postgresql://user:pass@postgres:5432/shortener | Conexión a Postgres para Prisma    |
| REDIS_URL            | redis://redis:6379                             | Conexión a Redis                   |
| JWT_SECRET           | super_secret_min_32_chars                      | Secreto para firmar JWTs           |
| JWT_EXPIRES_IN       | 24h                                            | Duración del token JWT             |
| SALT_ROUNDS          | 12                                             | Factor de coste para bcrypt        |
| IP_HASH_SALT         | random_salt_here                               | Salt para hashing de IPs           |
| APP_BASE_URL         | <http://localhost:4321>                        | URL base del frontend              |
| API_PORT             | 3000                                           | Puerto del servicio de API         |
| NODE_ENV             | development                                    | Entorno: development \| production |
| GEOIP_DB_PATH        | ./data/GeoLite2-City.mmdb                      | Ruta a la base de datos MaxMind    |
| BULL_CONCURRENCY     | 5                                              | Workers concurrentes de BullMQ     |
| RATE_LIMIT_WINDOW_MS | 60000                                          | Ventana de rate limiting en ms     |
| RATE_LIMIT_MAX_LINKS | 10                                             | Máx. links por usuario por ventana |

# **10\. Estrategia de testing**

## **10.1 Tests unitarios**

Se prioriza la cobertura de la capa de servicios, que concentra la lógica de negocio.

- linkService: generación de código Base62, validación de URLs, lógica de expiración.
- analyticsService: agregaciones por periodo, formateo de datos para el frontend.
- authService: validación de contraseñas, generación y verificación de JWT.
- geo.ts y hash.ts: funciones puras fáciles de testear.

Framework: Vitest. Meta de cobertura: 60% en la capa de servicios.

## **10.2 Tests de integración**

- Usar Supertest para probar los endpoints de la API contra una instancia de Postgres en Docker.
- Cubrir los happy paths y casos de error (401, 404, 422) de los endpoints principales.
- Usar una base de datos de test separada que se resetea entre cada test suite.

## **10.3 Testing manual**

- Mantener una colección de Bruno (alternativa open-source a Postman) con todos los endpoints del proyecto.
- La colección debe incluir ejemplos de request y response esperada para cada endpoint.
- Incluir variables de entorno en la colección para desarrollo y producción.

# **11\. Despliegue**

## **11.1 Entorno de producción recomendado**

Para portafolio, la opción más sencilla con free tier es:

- Frontend (Astro): Vercel o Netlify. Soporte nativo para Astro SSR.
- API (Express): Railway o Render. Soporte nativo para Docker Compose o Dockerfile.
- PostgreSQL: Railway (managed) o Supabase (free tier con 500MB).
- Redis: Upstash (free tier, 10k comandos/día). Suficiente para un proyecto de portafolio.
- Base de datos GeoIP MaxMind: se incluye en el contenedor de API como archivo estático.

## **11.2 Checklist de despliegue**

- Configurar todas las variables de entorno en el proveedor de hosting.
- Verificar que DATABASE_URL apunta a la base de datos de producción.
- Ejecutar npx prisma migrate deploy en el primer despliegue.
- Verificar que el redirect engine responde en menos de 20ms desde producción.
- Configurar dominio personalizado en el proveedor del frontend.
- Actualizar APP_BASE_URL en la API con el dominio real.
- Verificar CORS en la API: solo aceptar peticiones del dominio del frontend.
- Probar el flujo completo: crear link → hacer click → ver analytics.

## **11.3 CORS**

La API debe configurar CORS para aceptar peticiones únicamente desde el dominio del frontend. En desarrollo: <http://localhost:4321>. En producción: el dominio real del frontend. Se debe configurar explícitamente en Express usando el paquete cors con la opción origin.

# **12\. Glosario**

| **Término**              | **Definición**                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Base62**               | Sistema de codificación que usa los caracteres 0-9, a-z, A-Z (62 caracteres). Permite generar códigos cortos con alta cardinalidad. 6 caracteres en Base62 = 62^6 = ~56 mil millones de combinaciones posibles.     |
| **BullMQ**               | Librería de Node.js para gestión de colas de trabajo sobre Redis. Permite procesar jobs de forma asíncrona con reintentos, prioridades y concurrencia configurable.                                                 |
| **Cache hit / miss**     | Cache hit: el dato solicitado existe en Redis y se retorna directamente. Cache miss: el dato no está en Redis y hay que consultar PostgreSQL.                                                                       |
| **Fire-and-forget**      | Patrón de programación donde una operación se inicia sin esperar su resultado. En este proyecto, el encolamiento del click es fire-and-forget para no bloquear el redirect.                                         |
| **GeoIP**                | Técnica para determinar la ubicación geográfica de una dirección IP. Se usa una base de datos local (MaxMind GeoLite2) para evitar latencia de APIs externas.                                                       |
| **Islands architecture** | Patrón de frontend donde la mayoría de la página es HTML estático y solo los componentes interactivos se hidratan con JavaScript (islands). Astro implementa este patrón nativamente.                               |
| **JWT**                  | JSON Web Token. Estándar para autenticación stateless. El servidor firma un token con un secreto; el cliente lo envía en cada petición y el servidor verifica la firma sin consultar una base de datos de sesiones. |
| **p95**                  | Percentil 95. El 95% de las peticiones se completan en el tiempo indicado o menos. Es el estándar de la industria para medir latencia de APIs.                                                                      |
| **Prisma**               | ORM (Object-Relational Mapper) para Node.js. Genera un cliente tipado a partir del schema.prisma y gestiona las migraciones de base de datos.                                                                       |
| **Rate limiting**        | Mecanismo para limitar el número de peticiones que un cliente puede hacer en una ventana de tiempo. Protege la API de abuso y ataques de fuerza bruta.                                                              |
| **Redis TTL**            | Time To Live. Tiempo en segundos después del cual Redis expira automáticamente una clave. Se usa para que el caché de redirects se invalide y se refresque periódicamente.                                          |
| **SSR**                  | Server-Side Rendering. Las páginas se generan en el servidor en cada petición, en lugar de enviarse como HTML estático. Permite acceso a cookies y datos de sesión en el servidor.                                  |

_- Fin del documento -_