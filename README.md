# Notify Hub

Microservicio de notificaciones (email y SMS) pensado para ser consumido por otras aplicaciones, por ejemplo un sistema de reservas que necesita avisar al cliente cuando se crea una reserva.

Recibe la solicitud por HTTP, la guarda en base de datos, la encola y la envía en segundo plano con reintentos automáticos. Es **multi-tenant**: cada aplicación cliente es un *Project* con sus propias API keys.

## Características

- Canales: **EMAIL** (Resend) y **SMS** (Infobip o proveedor *mock* para desarrollo).
- **Idempotencia** por `Idempotency-Key`: reenviar la misma petición no duplica el mensaje.
- **Envío asíncrono** con BullMQ + Redis: 3 intentos con backoff exponencial.
- **Historial de intentos** (`DeliveryAttempt`) con proveedor, estado y error de cada envío.
- **Reenvío manual** de notificaciones enviadas o fallidas.
- Autenticación por **API key** (clientes) y **token de administrador** (gestión de proyectos).
- Proveedores intercambiables: agregar uno nuevo no toca el resto del código.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | NestJS 11 + CQRS |
| Base de datos | PostgreSQL + Prisma 7 (adapter `pg`) |
| Cola | BullMQ + Redis |
| Email | Resend |
| SMS | Infobip (o mock) |
| Validación | class-validator, Joi (variables de entorno) |
| Tests | Jest |

---

## Arquitectura

![Diagrama Arquitectura](./docs/arquitectura-notify-hub.svg)

> La API y el worker corren hoy en el mismo proceso. Son dos roles distintos, así que más adelante se pueden desplegar por separado sin cambiar la lógica.

---

## Diagrama de componentes

![Diagrama de Componentes](./docs/componentes-notify-hub.svg)

---

### Mapa de endpoints

```mermaid
flowchart LR
    subgraph ADMIN["Administración - header x-admin-token"]
        A1["POST /admin/projects"]
        A2["POST /admin/projects/:projectId/api-keys"]
        A3["POST /admin/projects/:projectId/api-keys/:apiKeyId/revoke"]
    end

    subgraph CLIENT["Clientes - header Authorization: Bearer ntf_live_..."]
        C1["GET /v1/projects/me"]
        C2["POST /v1/notifications"]
        C3["POST /v1/notifications/:id/resend"]
    end
```

### Detalle

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/admin/projects` | `x-admin-token` | Crea un proyecto (`name`, `slug`) |
| `POST` | `/admin/projects/:projectId/api-keys` | `x-admin-token` | Genera una API key. **La llave completa solo se muestra en esta respuesta** |
| `POST` | `/admin/projects/:projectId/api-keys/:apiKeyId/revoke` | `x-admin-token` | Revoca una API key |
| `GET` | `/v1/projects/me` | API key | Devuelve el `projectId` asociado a la llave |
| `POST` | `/v1/notifications` | API key + `Idempotency-Key` | Crea y encola una notificación |
| `POST` | `/v1/notifications/:id/resend` | API key | Reenvía una notificación en estado `SENT` o `FAILED` |

### Formato de respuesta

Todas las respuestas usan el mismo envoltorio:

```json
{
  "success": true,
  "data": { },
  "meta": { "timestamp": "2026-10-11T12:00:00.000Z" }
}
```

```json
{
  "success": false,
  "error": { "code": "BAD_REQUEST", "details": "Idempotency-Key header is required." },
  "meta": { "timestamp": "2026-10-11T12:00:00.000Z" }
}
```

| Código | Cuándo ocurre |
|---|---|
| `400` | Validación fallida, falta `Idempotency-Key`, destinatario inválido |
| `401` | API key o token de administrador inválido, revocado o expirado; proyecto inactivo |
| `404` | Notificación o proyecto no encontrado |
| `409` | `Idempotency-Key` ya usada con datos distintos; reenvío de una notificación que no está `SENT` ni `FAILED` |

### Flujo: crear una notificación

```mermaid
sequenceDiagram
    autonumber
    participant C as App cliente
    participant API as NotificationsController
    participant G as ApiKeyGuard
    participant H as CreateNotificationHandler
    participant DB as PostgreSQL
    participant Q as Redis (BullMQ)
    participant W as NotificationProcessor
    participant P as Resend / Infobip

    C->>API: POST /v1/notifications (Bearer + Idempotency-Key)
    API->>G: validar API key
    G->>DB: buscar keyHash, revocación, expiración, proyecto activo
    G-->>API: auth.projectId
    API->>H: CreateNotificationCommand
    H->>DB: buscar projectId + idempotencyKey
    alt ya existe con los mismos datos
        H-->>C: notificación existente
    else ya existe con datos distintos
        H-->>C: 409 Conflict
    else es nueva
        H->>DB: crear Notification (PENDING)
        H->>DB: actualizar a QUEUED
        H->>Q: enqueue(notificationId)
        H-->>C: 201 notificación QUEUED
    end

    Q->>W: entregar job
    W->>DB: estado PROCESSING + crear DeliveryAttempt
    W->>P: enviar mensaje
    alt envío correcto
        P-->>W: providerMessageId
        W->>DB: DeliveryAttempt SUCCESS + Notification SENT
    else falla
        P-->>W: error
        W->>DB: DeliveryAttempt FAILED
        W->>DB: QUEUED (reintento) o FAILED (último intento)
    end
```

### Estados de una notificación

```mermaid
stateDiagram-v2
    [*] --> PENDING: se crea el registro
    PENDING --> QUEUED: se encola el job
    QUEUED --> PROCESSING: el worker toma el job
    PROCESSING --> SENT: envío correcto
    PROCESSING --> QUEUED: falla y quedan intentos
    PROCESSING --> FAILED: falla el último intento
    SENT --> QUEUED: reenvío manual
    FAILED --> QUEUED: reenvío manual
```

> El enum también define `CANCELLED` y el canal `WHATSAPP`, pero hoy ningún flujo los usa. El DTO solo acepta `EMAIL` y `SMS`.

---

## Modelo entidad-relación
![Diagrama ER](./docs/ER%20notify-hub.svg)

Entidades principales: `Project`, `ApiKey`, `Notification` y `DeliveryAttempt`.

---

## Requisitos previos

- Node.js 22 o superior
- npm
- PostgreSQL 14 o superior
- Redis 6.2 o superior
- Cuenta en [Resend](https://resend.com) (API key y un remitente verificado)
- Opcional: cuenta en Infobip para SMS reales. Sin ella se usa el proveedor `mock`.

## Configuración

Crea un archivo `.env` en la raíz del proyecto:

```env
# Servidor
PORT=3000

# Base de datos
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/notify_hub

# Redis (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Seguridad
ADMIN_API_TOKEN=cambia-este-token-de-admin
API_KEY_PEPPER=cambia-este-secreto-largo

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM="Mi App <no-reply@tudominio.com>"

# SMS: mock | infobip
SMS_PROVIDER=mock
INFOBIP_API_KEY=
INFOBIP_BASE_URL=
INFOBIP_SENDER=ServiceSMS
```

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | Sí | Puerto HTTP |
| `DATABASE_URL` | Sí | Cadena de conexión a PostgreSQL |
| `REDIS_HOST` / `REDIS_PORT` | Sí | Conexión a Redis |
| `ADMIN_API_TOKEN` | Sí | Token para los endpoints `/admin/*` |
| `API_KEY_PEPPER` | Sí | Secreto con el que se calcula el hash HMAC de las API keys |
| `RESEND_API_KEY` | Sí | API key de Resend |
| `EMAIL_FROM` | Sí | Remitente de los correos |
| `SMS_PROVIDER` | No | `mock` (por defecto) o `infobip` |
| `INFOBIP_API_KEY` / `INFOBIP_BASE_URL` | Solo si `SMS_PROVIDER=infobip` | Credenciales de Infobip |
| `INFOBIP_SENDER` | No | Remitente del SMS (por defecto `ServiceSMS`) |

Genera valores seguros para los secretos con:

```bash
openssl rand -hex 32
```

> ⚠️ **Cambiar `API_KEY_PEPPER` invalida todas las API keys ya emitidas**, porque el hash guardado en base de datos deja de coincidir. Define el valor una vez y no lo cambies.

> ⚠️ Si Redis es administrado, debe tener la política `maxmemory-policy noeviction`. BullMQ lo requiere para no perder jobs.

## Cómo levantar el proyecto

### 1. Infraestructura local con Docker

Crea un `docker-compose.yml` (o levanta PostgreSQL y Redis como prefieras):

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: notify_hub
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7
    command: ["redis-server", "--maxmemory-policy", "noeviction"]
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

```bash
docker compose up -d
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Preparar la base de datos

```bash
# Aplicar las migraciones
npx prisma migrate deploy

# Generar el cliente de Prisma (se genera en src/generated/prisma)
npx prisma generate
```

> En desarrollo, mientras modificas el esquema, usa `npx prisma migrate dev` en lugar de `migrate deploy`.

### 4. Ejecutar

```bash
# Desarrollo con recarga automática
npm run start:dev

# Producción
npm run build
npm run start:prod
```

Si todo va bien verás en consola:

```
Connection database success.
Notify Hub running on port 3000
```

---

## Primeros pasos con la API

### 1. Crear un proyecto

```bash
curl -X POST http://localhost:3000/admin/projects \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_API_TOKEN" \
  -d '{ "name": "Sistema de Reservas", "slug": "sistema-reservas" }'
```

El `slug` solo admite minúsculas, números y guiones.

### 2. Generar una API key

```bash
curl -X POST http://localhost:3000/admin/projects/<projectId>/api-keys \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_API_TOKEN" \
  -d '{ "name": "reservas-produccion" }'
```

La respuesta incluye el campo `apikey` (formato `ntf_live_...`). **Guárdala en ese momento: no se puede volver a consultar**, en base de datos solo se almacena su hash.

### 3. Enviar un correo

```bash
curl -X POST http://localhost:3000/v1/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ntf_live_xxxxx" \
  -H "Idempotency-Key: reserva-123-created" \
  -d '{
    "channel": "EMAIL",
    "recipient": "cliente@correo.com",
    "subject": "Reserva confirmada",
    "htmlContent": "<h1>Tu reserva fue confirmada</h1>",
    "metadata": { "reservationId": "123" }
  }'
```

### 4. Enviar un SMS

```bash
curl -X POST http://localhost:3000/v1/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ntf_live_xxxxx" \
  -H "Idempotency-Key: reserva-123-sms" \
  -d '{
    "channel": "SMS",
    "recipient": "+50255551234",
    "textContent": "Tu reserva #123 fue confirmada."
  }'
```

### 5. Reenviar una notificación

```bash
curl -X POST http://localhost:3000/v1/notifications/<notificationId>/resend \
  -H "Authorization: Bearer ntf_live_xxxxx"
```

### Reglas del cuerpo de la petición

| Campo | EMAIL | SMS |
|---|---|---|
| `channel` | `"EMAIL"` | `"SMS"` |
| `recipient` | Correo válido (máx. 320) | Número en formato **E.164**, ej. `+50255551234` |
| `subject` | Obligatorio (máx. 255) | No aplica |
| `htmlContent` | Obligatorio | No aplica |
| `textContent` | Opcional | Obligatorio (máx. 1600) |
| `metadata` | Opcional (objeto JSON) | Opcional (objeto JSON) |

---

## Idempotencia

El header `Idempotency-Key` es obligatorio en `POST /v1/notifications`. La unicidad se valida por proyecto (`projectId + idempotencyKey`):

- Misma llave y **mismos datos** → devuelve la notificación ya creada, sin enviar otra.
- Misma llave y **datos distintos** → `409 Conflict`.

Recomendación: construir la llave con el evento de negocio, por ejemplo `reserva-{id}-created`, para que un reintento de la app cliente nunca duplique el mensaje.

## Reintentos

Cada notificación se procesa con **3 intentos** y backoff exponencial (base de 1 segundo). Cada intento queda registrado en `DeliveryAttempt`. Si los 3 fallan, la notificación pasa a `FAILED` y puede reenviarse manualmente con `/resend`.

## Agregar un nuevo proveedor de SMS

1. Crea una clase que implemente `SmsProvider` en `src/modules/notifications/infrastructure/sms/providers/`.
2. Agrega su nombre a `SMS_PROVIDER_NAMES` en `src/config/sms-providers.ts`.
3. Regístralo en el mapa `smsProviders` de `notifications.module.ts`.
4. Agrega sus variables de entorno en `src/config/envs.ts`.
5. Cambia `SMS_PROVIDER` en el `.env`.

---

## Estructura del proyecto

```
src/
├── main.ts
├── app.module.ts
├── common/                 # guards, filtros, interceptores, DTO de respuesta
├── config/                 # validación de variables de entorno (Joi)
├── database/               # PrismaService y manejo de errores de Prisma
├── generated/prisma/       # cliente generado por Prisma
└── modules/
    ├── projects/           # alta de proyectos (admin)
    ├── api-keys/           # emisión, revocación y validación de API keys
    └── notifications/
        ├── application/    # controllers, commands/handlers, cola, processor, registry
        ├── domain/         # DTO e interfaces (NotificationSender, SmsProvider)
        └── infrastructure/ # email (Resend) y sms (Infobip, mock)
```

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run start:dev` | Desarrollo con recarga automática |
| `npm run start:prod` | Ejecuta la versión compilada (`dist/`) |
| `npm run build` | Compila el proyecto |
| `npm run lint` | Linter con corrección automática |
| `npm run format` | Formatea con Prettier |
| `npm test` | Tests unitarios |
| `npm run test:cov` | Cobertura de tests |
| `npm run test:e2e` | Tests end-to-end |

## Integrar con otra aplicación (ej. reservas)

1. Un administrador crea un proyecto y genera una API key para la aplicación.
2. La aplicación guarda la key como variable de entorno.
3. Al ocurrir el evento (reserva creada), llama a `POST /v1/notifications` con una `Idempotency-Key` derivada del evento.
4. La aplicación **no debe depender** de que el hub responda para completar su operación principal: si el hub no está disponible, debe registrar el fallo y reintentar después.

## Notas y limitaciones conocidas

- La conexión a Redis solo admite `host` y `port` (sin contraseña ni TLS). Si usas un Redis que los requiera, hay que ampliar `BullModule.forRoot` en `app.module.ts`.
- Si falla el encolado, la notificación vuelve a `PENDING` y hoy nada la reencola automáticamente. Un job periódico que reencole las `PENDING` antiguas cierra ese caso.
- No hay endpoint de consulta de notificaciones ni *health check*.
