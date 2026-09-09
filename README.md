<div align="center">

# Upstack API

**Backend de la plataforma Upstack — motor de comprobaciones, BullMQ, Stripe y alertas por email**

![Node.js](https://img.shields.io/badge/Node.js%2020-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

---

> Upstack monitoriza continuamente tus endpoints HTTP en intervalos configurables, registra el uptime y el tiempo de respuesta, envía alertas por email cuando un endpoint cae o se recupera, y ofrece una página de estado pública por workspace.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     Upstack API (Node.js)                        │
│                                                                  │
│  ┌──────────┐   ┌────────────┐   ┌─────────────────────────┐   │
│  │  Express │   │  BullMQ    │   │  Scheduler (node-cron)  │   │
│  │  REST API│   │  Worker    │◄──│  (cada 1 minuto)        │   │
│  └────┬─────┘   └─────┬──────┘   └─────────────────────────┘   │
│       │               │                                          │
│       ▼               ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Prisma ORM                             │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼────────────────────────────────────────┘
                          │
          ┌───────────────┼──────────────────┐
          ▼               ▼                  ▼
   ┌────────────┐  ┌────────────┐   ┌──────────────┐
   │ PostgreSQL │  │   Redis    │   │  APIs externas│
   └────────────┘  └────────────┘   └──────────────┘
          │
          ▼
   ┌──────────────────────────────┐
   │  Integraciones               │
   │  - Resend (alertas email)    │
   │  - Stripe (billing)          │
   └──────────────────────────────┘
```

---

## Tecnologías

| Capa | Tecnología | Propósito |
|---|---|---|
| Runtime | Node.js 20 | Entorno de ejecución |
| Framework | Express 4 | Servidor HTTP y routing |
| ORM | Prisma 5 | Acceso a datos y migraciones |
| Base de datos | PostgreSQL 15 | Almacenamiento principal |
| Cola de trabajos | BullMQ 5 + IORedis | Cola de comprobaciones concurrentes |
| Scheduler | node-cron | Disparador de trabajos por cron |
| Autenticación | jsonwebtoken + bcryptjs | JWT |
| Email | Resend | Alertas transaccionales |
| Billing | Stripe | Gestión de suscripciones |
| Validación | Zod | Validación de esquemas de entrada |
| Seguridad | helmet + cors + rate-limit | Hardening HTTP |
| HTTP Client | axios | Comprobaciones de endpoints |
| Contenedores | Docker Compose | Entorno local |
| Deploy | Fly.io | Producción |

---

## Requisitos previos

- Node.js 20+
- Docker Desktop
- Cuenta en [Resend](https://resend.com) para alertas por email
- Cuenta en [Stripe](https://stripe.com) para billing

---

## Configuración local

```bash
# 1. Clonar el repositorio
git clone https://github.com/DarioSanchez99/upstack-api.git
cd upstack-api

# 2. Variables de entorno
cp .env.example .env
# Rellenar todos los valores requeridos

# 3. Levantar la infraestructura (PostgreSQL + Redis + pgAdmin)
docker compose up -d

# 4. Instalar dependencias
npm install

# 5. Ejecutar migraciones
npx prisma migrate dev --name init

# 6. (Opcional) Seed de la base de datos
npm run db:seed

# 7. Iniciar el servidor
npm run dev
```

API disponible en: `http://localhost:3000`

---

## Variables de entorno

| Variable | Requerida | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL |
| `REDIS_URL` | Sí | URL de conexión Redis |
| `JWT_SECRET` | Sí | Secreto para firmar JWT (mín. 16 caracteres) |
| `RESEND_API_KEY` | Sí | API key de Resend |
| `STRIPE_SECRET_KEY` | Sí | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Sí | Secreto del webhook de Stripe |
| `STRIPE_PRO_PRICE_ID` | Sí | Price ID del plan PRO en Stripe |
| `FRONTEND_URL` | No | Origen del frontend (CORS) |
| `CHECK_ENGINE_ENABLED` | No | `false` para desactivar el scheduler |

---

## Endpoints de la API

### Autenticación — `/api/auth`

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | No | Crear cuenta + workspace |
| POST | `/api/auth/login` | No | Login → devuelve JWT |
| GET | `/api/auth/me` | Sí | Perfil del usuario autenticado |

### Monitores — `/api/monitors`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/monitors` | Listar monitores del workspace |
| POST | `/api/monitors` | Crear monitor |
| GET | `/api/monitors/:id` | Obtener monitor |
| PATCH | `/api/monitors/:id` | Actualizar monitor |
| DELETE | `/api/monitors/:id` | Eliminar monitor |
| GET | `/api/monitors/:id/results` | Historial de comprobaciones |
| GET | `/api/monitors/:id/stats` | Estadísticas de uptime |

### Billing — `/api/billing`

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/billing/create-checkout` | Crear sesión de pago Stripe |
| POST | `/api/billing/portal` | Abrir portal de cliente Stripe |
| POST | `/api/billing/webhook` | Receptor de webhooks Stripe |
| GET | `/api/billing/subscription` | Info del plan actual |

### Página de estado — `/api/status/:slug`

Pública. Devuelve el estado de todos los monitores de un workspace.

---

## Motor de comprobaciones

El motor funciona en dos capas:

**Scheduler (node-cron)** — se ejecuta cada minuto y encola los monitores cuyo `nextCheck <= NOW()`.

**Worker (BullMQ)** — procesa las comprobaciones con concurrencia configurable:
1. Envía la petición HTTP con la configuración del monitor
2. Mide el `responseTimeMs`
3. Determina el estado: `UP` / `DEGRADED` (lento) / `DOWN` (error o timeout)
4. Guarda el `CheckResult`
5. Actualiza el monitor y dispara alertas si el estado cambia

**Anti-spam de alertas**: la alerta `DOWN` solo se envía tras 2 resultados DOWN consecutivos; la alerta `RECOVERED` solo al volver de DOWN → UP.

---

## Documentación interactiva

Con el servidor en marcha, visita: `http://localhost:3000/api/docs`

---

## Licencia

MIT
