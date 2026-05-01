# Zyklus Halo — Enterprise Asset Management System

[![Status](https://img.shields.io/badge/Status-Production--Ready-success?style=for-the-badge)](https://github.com/your-repo)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20PostgreSQL-blue?style=for-the-badge)](https://github.com/your-repo)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini%202.5%20Flash-orange?style=for-the-badge)](https://ai.google.dev/)

**Zyklus Halo** es un sistema de gestión patrimonial (EAM) de última generación, diseñado para el seguimiento de alto rendimiento, el monitoreo inteligente y la gestión automatizada del ciclo de vida de los activos institucionales. Construido con un enfoque en velocidad, seguridad y analíticas impulsadas por Inteligencia Artificial (Zykla AI).

---

## 📖 Documentación Oficial

Para una explicación detallada sobre la arquitectura, el flujo de negocio, el sistema de Inteligencia Artificial (Zykla) y el catálogo de funcionalidades, por favor consulta la **[Documentación Oficial (DOCUMENTACION.md)](./DOCUMENTACION.md)**.

Allí encontrarás todo lo referente a:
1. Resumen Ejecutivo
2. Arquitectura de Software y Seguridad
3. Zykla AI (Motor de IA)
4. Ecosistema de Datos
5. Flujo de Negocio y Roles
6. Matriz de Escalación y Llamadas Twilio
7. Catálogo Práctico de Funciones

---

## ⚙️ Setup Rápido (Desarrollo)

### 1. Requisitos Previos
*   Node.js 18+
*   Instancia de PostgreSQL (ej. Supabase)
*   Google AI API Key (Gemini)
*   Cuenta de Twilio (SID, Token, Flow SID)

### 2. Configuración de Variables
Crea el archivo `backend/.env`:
```env
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=tu-secreto-seguro
GEMINI_API_KEY=tu-api-key

TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_STUDIO_FLOW_SID=...
TWILIO_FROM_NUMBER=...

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

### 3. Ejecución
En la raíz del workspace, instala las dependencias y corre el entorno de desarrollo:
```bash
# Instalar dependencias globales y de cada sub-proyecto
npm install

# Correr frontend y backend concurrentemente
npm run dev
```

---

*© 2026 Zyklus Halo Engineering. Diseñado con excelencia para control de activos industriales.*
