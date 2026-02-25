# Zyklus Halo — Control Patrimonial

Aplicación de control de activos y préstamos con **separación explícita entre backend y frontend**.

> **Documentación completa:** Ver [DOCUMENTACION.md](./DOCUMENTACION.md) para arquitectura detallada, variables de entorno, API, despliegue y más.

## Arquitectura

- **Backend:** API REST en Node.js + Express + TypeScript, en la carpeta `backend/`. Gestiona la lógica de negocio, autenticación (JWT) y acceso a PostgreSQL.
- **Frontend:** Cliente React + Vite en la carpeta `src/`. Consume únicamente la API REST del backend (HTTP + JWT); no accede directamente a la base de datos.

## Cómo ejecutar

1. **Backend:** En una terminal, desde la raíz del proyecto:
   ```bash
   npm run dev:backend
   ```
   O desde `backend/`: `npm run dev`. El servidor escucha en `http://localhost:3000` por defecto. Configura `backend/.env` con `PORT`, `DATABASE_URL` (PostgreSQL, p. ej. cadena de Supabase), `JWT_SECRET` y opcionalmente `FRONTEND_ORIGIN`.

2. **Frontend:** En otra terminal:
   ```bash
   npm run dev:frontend
   ```
   O `npm run dev`. La app se sirve en `http://localhost:5173`. Crea un `.env` en la raíz con `VITE_API_URL=http://localhost:3000` para que el cliente apunte al backend.

Para desarrollo completo, ejecuta ambos (backend y frontend) en terminales separadas.

## Optimización de base de datos

Para mejorar el rendimiento con muchos activos (10k+), ejecuta el script de índices en el SQL Editor de Supabase:

```
backend/migrations/001_add_performance_indexes.sql
```

## Scripts

- `npm run dev` / `npm run dev:frontend` — inicia el frontend (Vite).
- `npm run dev:backend` — inicia el backend (Express con tsx watch).
- `npm run build` — compila el frontend (TypeScript + Vite).

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

