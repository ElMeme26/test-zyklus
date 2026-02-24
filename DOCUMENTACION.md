# Zyklus Halo — Documentación Técnica y Arquitectura

Sistema de **Control Patrimonial** para gestión de activos, préstamos, instituciones y mantenimiento. Aplicación full-stack con separación explícita entre frontend y backend.

---

## Índice

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Arquitectura General](#2-arquitectura-general)
3. [Separación Frontend / Backend](#3-separación-frontend--backend)
4. [Especificaciones de Conexión](#4-especificaciones-de-conexión)
5. [Variables de Entorno (.env)](#5-variables-de-entorno-env)
6. [Cómo Ejecutar el Proyecto](#6-cómo-ejecutar-el-proyecto)
7. [Despliegue](#7-despliegue)
8. [Arquitectura Técnica Detallada](#8-arquitectura-técnica-detallada)
9. [API REST](#9-api-rest)
10. [Base de Datos](#10-base-de-datos)
11. [Rendimiento y Mantenibilidad](#11-rendimiento-y-mantenibilidad)
12. [Estructura del Código](#12-estructura-del-código)

---

## 1. Resumen del Proyecto

| Aspecto | Descripción |
|---------|-------------|
| **Nombre** | Zyklus Halo — Control Patrimonial |
| **Propósito** | Gestión de activos, préstamos, instituciones, mantenimiento y auditoría |
| **Tipo** | Aplicación web full-stack (SPA + API REST) |
| **PWA** | Sí — Service Worker para notificaciones push y cache offline |

### Roles de Usuario

| Rol | Descripción |
|-----|-------------|
| `ADMIN_PATRIMONIAL` | Administrador patrimonial, gestión completa |
| `LIDER_EQUIPO` | Líder de equipo, aprobación de solicitudes |
| `GUARDIA` | Escáner QR para check-in/check-out |
| `AUDITOR` | Vista de auditoría, KPIs y gráficos |
| `USUARIO` | Usuario final, solicitudes y préstamos |

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite :5173)                           │
│  React 18 + TypeScript + TailwindCSS + Vite 7 + PWA                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ AuthContext | DataContext | ThemeContext                        │    │
│  │ RoleRouter → LoginScreen | AdminDashboard | ManagerInbox | ...  │    │
│  │ apiFetch (client.ts) → api/*.ts                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP + JSON
                                    │ Authorization: Bearer <JWT>
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Express :3000)                         │
│  Node.js + Express 4 + TypeScript                                       │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ CORS | compression | express.json                               │    │
│  │ authMiddleware → routes/* → services/*                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ pg Pool
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL (Supabase)                           │
│  assets | requests | users | institutions | bundles | maintenance_logs  │
│  notifications | audit_logs                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Separación Frontend / Backend

### Frontend (`src/`)

| Ubicación | Tecnología | Descripción |
|-----------|------------|-------------|
| `src/` | React 18, Vite 7, TypeScript | SPA React |
| `src/api/` | fetch + JWT | Cliente HTTP hacia backend |
| `src/components/` | React + Tailwind | Componentes UI y vistas por rol |
| `src/context/` | React Context | Auth, Data, Theme |
| `src/lib/` | Utilidades | Export (PDF/Excel), Gemini, utils |
| `public/sw.js` | Service Worker | PWA: push, cache offline |

**El frontend NO accede directamente a la base de datos.** Solo consume la API REST del backend.

### Backend (`backend/`)

| Ubicación | Tecnología | Descripción |
|-----------|------------|-------------|
| `backend/src/` | Express 4, TypeScript | API REST |
| `backend/src/routes/` | Express Router | Rutas HTTP |
| `backend/src/services/` | Lógica de negocio | Servicios que acceden a PostgreSQL |
| `backend/src/middleware/` | auth.ts | JWT + roles |
| `backend/src/db/` | pg (node-postgres) | Pool de conexiones PostgreSQL |

---

## 4. Especificaciones de Conexión

### Frontend → Backend

| Aspecto | Valor |
|---------|-------|
| **Protocolo** | HTTP/HTTPS |
| **Formato** | JSON (`Content-Type: application/json`) |
| **Autenticación** | JWT en header `Authorization: Bearer <token>` |
| **Base URL** | Configurable vía `VITE_API_URL` (default: `http://localhost:3000`) |

### Backend → Base de Datos

| Aspecto | Valor |
|---------|-------|
| **Motor** | PostgreSQL |
| **Cliente** | `pg` (node-postgres) |
| **Pool** | max 10 conexiones, idleTimeout 30s |
| **Cadena** | `DATABASE_URL` (ej. Supabase connection string) |

### CORS

- Orígenes permitidos: `FRONTEND_ORIGIN` y dominios `*.netlify.app`
- `credentials: true` para cookies/fetch con credenciales

---

## 5. Variables de Entorno (.env)

### Frontend (raíz del proyecto)

Crear archivo `.env` en la raíz:

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `VITE_API_URL` | No | URL base del backend | `http://localhost:3000` |
| `VITE_GEMINI_API_KEY` | Opcional | API key de Google Gemini para ChatAssistant | `AIza...` |

> **Nota:** Las variables en Vite deben prefijarse con `VITE_` para exponerse al cliente.

### Backend (`backend/.env`)

Crear archivo `.env` dentro de `backend/`:

| Variable | Requerida | Descripción | Ejemplo |
|----------|-----------|-------------|---------|
| `PORT` | No | Puerto del servidor | `3000` |
| `FRONTEND_ORIGIN` | No | Origen CORS permitido | `http://localhost:5173` |
| `DATABASE_URL` | **Sí** | Cadena de conexión PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | **Sí** (prod) | Secreto para firmar JWT | Cadena aleatoria segura |

### Ejemplo de archivos `.env.example`

Ver archivos `.env.example` en la raíz y en `backend/` para copiar y configurar.

---

## 6. Cómo Ejecutar el Proyecto

### Prerrequisitos

- Node.js 18+ y npm
- PostgreSQL (o cuenta Supabase)
- Cuenta Supabase (recomendado) para base de datos

### Pasos

1. **Clonar e instalar dependencias**

   ```bash
   git clone <repo>
   cd test-zyklus
   npm install
   cd backend && npm install && cd ..
   ```

2. **Configurar variables de entorno**

   - Copiar `backend/.env.example` → `backend/.env`
   - Copiar `.env.example` → `.env`
   - Editar y completar `DATABASE_URL`, `JWT_SECRET`, etc.

3. **Ejecutar backend** (terminal 1)

   ```bash
   npm run dev:backend
   ```

   El servidor escucha en `http://localhost:3000`.

4. **Ejecutar frontend** (terminal 2)

   ```bash
   npm run dev:frontend
   ```

   La app se sirve en `http://localhost:5173`.

5. **Verificar**

   - `GET http://localhost:3000/health` → `{ ok: true, database: "connected" }`
   - Abrir `http://localhost:5173` en el navegador

### Scripts disponibles

| Script | Ubicación | Descripción |
|--------|-----------|-------------|
| `npm run dev` | Raíz | Inicia frontend (Vite) |
| `npm run dev:frontend` | Raíz | Inicia frontend |
| `npm run dev:backend` | Raíz | Inicia backend con tsx watch |
| `npm run build` | Raíz | Compila frontend (TypeScript + Vite) |
| `npm run preview` | Raíz | Vista previa del build del frontend |
| `npm run dev` | backend/ | Backend en modo desarrollo |
| `npm run build` | backend/ | Compila backend a `dist/` |
| `npm run start` | backend/ | Ejecuta backend en producción |

---

## 7. Despliegue

### Frontend (Netlify, Vercel, etc.)

1. **Build**

   ```bash
   npm run build
   ```

   Salida en `dist/`.

2. **Variables de entorno en el host**

   - `VITE_API_URL` = URL pública del backend (ej. `https://api.tudominio.com`)
   - `VITE_GEMINI_API_KEY` (opcional)

3. **Directorio de publicación:** `dist`

4. **Netlify:** El backend ya permite `*.netlify.app` en CORS.

### Backend (Railway, Render, Fly.io, etc.)

1. **Build**

   ```bash
   cd backend && npm run build
   ```

2. **Variables de entorno**

   - `PORT` (el host suele asignarlo)
   - `DATABASE_URL` (PostgreSQL)
   - `JWT_SECRET` (obligatorio en producción)
   - `FRONTEND_ORIGIN` = URL del frontend desplegado

3. **Comando de inicio**

   ```bash
   node dist/index.js
   ```

### Base de datos

- Usar **Supabase** o cualquier PostgreSQL gestionado.
- Ejecutar migraciones de índices en el SQL Editor de Supabase:

  ```sql
  -- Contenido de backend/migrations/001_add_performance_indexes.sql
  ```

### Docker (ejemplo conceptual)

```dockerfile
# Backend
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json backend/
RUN npm ci --prefix . --omit=dev
COPY backend/ .
RUN npm run build
CMD ["node", "dist/index.js"]
```

---

## 8. Arquitectura Técnica Detallada

### Stack Tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Frontend | React | 18.2 |
| Frontend | Vite | 7.x |
| Frontend | TypeScript | 5.x |
| Frontend | TailwindCSS | 3.4 |
| Frontend | React Router | 7.x |
| Backend | Node.js | 18+ |
| Backend | Express | 4.x |
| Backend | TypeScript | 5.x |
| Base de datos | PostgreSQL | (Supabase) |
| Auth | JWT (jsonwebtoken) | 9.x |
| Passwords | bcrypt | 5.x |

### Flujo de Autenticación

1. Usuario envía `POST /auth/login` con `email` y `password`.
2. Backend valida credenciales, genera JWT con `sub`, `email`, `role`.
3. Frontend guarda token en `localStorage` bajo la clave `zf_token`.
4. Todas las peticiones autenticadas incluyen `Authorization: Bearer <token>`.
5. `authMiddleware` verifica el token y adjunta `req.user` (JwtPayload).
6. `requireRole(allowedRoles)` restringe rutas por rol.

### Flujo de Datos (Frontend)

1. `DataProvider` usa `useDataProvider` para cargar datos vía `apiFetch`.
2. `fetchData()` llama a `GET /api/data` y `GET /api/assets` (paginado).
3. El contexto expone `assets`, `requests`, `institutions`, etc., y funciones como `addAsset`, `approveRequest`, etc.
4. Los componentes consumen el contexto y disparan acciones que llaman a la API.

---

## 9. API REST

### Endpoints Públicos

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check + estado DB |
| POST | `/auth/login` | Login (email, password) → user + token |

### Endpoints Protegidos (requieren JWT)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/data` | Todos los datos (requests, institutions, notifications, etc.) |
| GET | `/api/data/stats` | Estadísticas (assetCounts, requestCounts, categoryCounts) |
| GET | `/api/assets` | Lista de activos (paginado, filtros) |
| GET | `/api/assets/next-tag` | Siguiente etiqueta disponible |
| GET | `/api/assets/:id` | Activo por ID |
| POST | `/api/assets` | Crear activo |
| POST | `/api/assets/import` | Importar activos (CSV) |
| PUT | `/api/assets/:id` | Actualizar activo |
| DELETE | `/api/assets/:id` | Eliminar activo |
| POST | `/api/assets/:id/validate-maintenance` | Validar mantenimiento |
| POST | `/api/institutions` | Crear institución |
| PUT | `/api/institutions/:id` | Actualizar institución |
| DELETE | `/api/institutions/:id` | Eliminar institución |
| POST | `/api/bundles` | Crear bundle |
| PATCH | `/api/bundles/:id` | Actualizar bundle |
| POST | `/api/requests` | Crear solicitud |
| POST | `/api/requests/batch` | Crear solicitudes en lote |
| POST | `/api/requests/bundle` | Solicitar bundle completo |
| PUT | `/api/requests/:id/approve` | Aprobar solicitud |
| PUT | `/api/requests/:id/reject` | Rechazar solicitud |
| PUT | `/api/requests/:id/feedback` | Devolver con feedback |
| PUT | `/api/requests/:id/cancel` | Cancelar solicitud |
| PUT | `/api/requests/:id/respond-feedback` | Responder feedback |
| PUT | `/api/requests/:id/renew` | Renovar préstamo |
| POST | `/api/guard/scan` | Escaneo QR (check-in/check-out) |
| POST | `/api/guard/scan/confirm-combo` | Confirmar check-in combo |
| POST | `/api/notifications/check-overdue` | Revisar préstamos vencidos |
| PUT | `/api/notifications/:id/read` | Marcar notificación leída |
| PUT | `/api/notifications/read-all` | Marcar todas leídas |
| POST | `/api/maintenance` | Reportar mantenimiento |
| PUT | `/api/maintenance/:id/resolve` | Resolver mantenimiento |
| GET | `/api/users` | Lista usuarios (admin) |
| POST | `/api/users` | Crear usuario (admin) |
| PUT | `/api/users/:id` | Actualizar usuario (admin) |
| DELETE | `/api/users/:id` | Eliminar usuario (admin) |

### Parámetros de Query (Assets)

- `page`, `limit` — Paginación
- `search` — Búsqueda por texto
- `category`, `status` — Filtros
- `availableOnly`, `maintenanceOnly`, `unbundledOnly` — Booleanos
- `export=true` — Hasta 10000 registros para exportación

---

## 10. Base de Datos

### Tablas Principales (inferidas del código)

| Tabla | Descripción |
|-------|-------------|
| `assets` | Activos patrimoniales |
| `requests` | Solicitudes y préstamos |
| `users` | Usuarios del sistema |
| `institutions` | Instituciones externas |
| `bundles` | Conjuntos de activos |
| `maintenance_logs` | Registros de mantenimiento |
| `notifications` | Notificaciones |
| `audit_logs` | Auditoría de acciones |

### Migración de Índices

Ejecutar en Supabase SQL Editor:

```sql
-- backend/migrations/001_add_performance_indexes.sql
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_bundle_id ON assets(bundle_id) WHERE bundle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_maintenance ON assets(maintenance_alert) WHERE maintenance_alert = true;

CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_asset_id ON requests(asset_id);
```

---

## 11. Rendimiento y Mantenibilidad

### Rendimiento

| Aspecto | Implementación |
|---------|-----------------|
| **Compresión** | `compression()` en Express |
| **Paginación** | Assets con `page`/`limit` (max 100, 10000 en export) |
| **Índices DB** | Migración `001_add_performance_indexes.sql` |
| **Queries paralelas** | `Promise.all` en dataService y assetService |
| **Pool de conexiones** | pg Pool con max 10, idleTimeout 30s |
| **Cache PWA** | Service Worker cachea GET estáticos (no API) |

### Mantenibilidad

| Aspecto | Descripción |
|---------|-------------|
| **TypeScript** | Tipado en frontend y backend |
| **Separación de capas** | Routes → Services → DB |
| **Contextos React** | Auth, Data, Theme centralizados |
| **API modular** | Un archivo por dominio (assets, requests, etc.) |
| **ESLint** | Reglas de calidad de código |

### Recomendaciones

- Usar `JWT_SECRET` fuerte y único en producción.
- No exponer `.env` en el repositorio (ya en `.gitignore`).
- Revisar límites de rate en el host de la API.
- Monitorear el pool de PostgreSQL en cargas altas.

---

## 12. Estructura del Código

```
test-zyklus/
├── src/                          # Frontend
│   ├── api/                      # Cliente HTTP
│   │   ├── client.ts             # apiFetch + token
│   │   ├── auth.ts, assets.ts, bundles.ts, data.ts, guard.ts,
│   │   ├── institutions.ts, maintenance.ts, notifications.ts,
│   │   └── requests.ts, users.ts
│   ├── components/
│   │   ├── admin/                # Dashboard admin
│   │   ├── auditor/              # Vista auditor
│   │   ├── guard/                # Escáner QR
│   │   ├── manager/              # Inbox líder
│   │   ├── user/                 # Home usuario
│   │   ├── ui/                   # Componentes reutilizables
│   │   ├── LoginScreen.tsx
│   │   └── RoleRouter.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   ├── DataContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── dataProvider/useDataProvider.ts
│   ├── lib/
│   │   ├── exportUtils.ts
│   │   ├── geminiUtils.ts
│   │   └── utils.ts
│   ├── types/index.ts
│   ├── App.tsx, main.tsx, index.css
│   └── registerSW.ts
├── public/
│   └── sw.js                     # Service Worker PWA
├── backend/
│   ├── src/
│   │   ├── index.ts              # Entrada Express
│   │   ├── db/index.ts           # Pool PostgreSQL
│   │   ├── middleware/auth.ts
│   │   ├── routes/               # auth, assets, bundles, data, guard,
│   │   │                         # institutions, maintenance, notifications,
│   │   │                         # requests, users
│   │   ├── services/             # Lógica de negocio
│   │   └── types/index.ts
│   └── migrations/
│       └── 001_add_performance_indexes.sql
├── .env.example                  # Variables frontend
├── backend/.env.example          # Variables backend
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── DOCUMENTACION.md              # Este archivo
```

---

## Referencias Rápidas

- **Health check:** `GET /health`
- **Login:** `POST /auth/login` → `{ user, token }`
- **Token storage:** `localStorage.getItem('zf_token')`
- **API base:** `VITE_API_URL` o `http://localhost:3000`
