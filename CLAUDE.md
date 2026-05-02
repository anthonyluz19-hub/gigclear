# gigclear — instrucciones para Claude

## Cómo trabajar conmigo

- **Idioma**: respondé siempre en **español rioplatense** (vos, no tú; "querés", "hacé", "mirá"). También en los mensajes de commit y PRs salvo que pida lo contrario.
- **Antes de cambios grandes**: explicá en pocas líneas qué vas a hacer y **esperá confirmación** antes de tocar archivos. Aplica a refactors, cambios de arquitectura, dependencias nuevas, migraciones, scripts destructivos. Para ediciones chicas y obvias (un typo, un import, un fix puntual) podés ir directo.
- **Al terminar cada tarea**: cerrá con un resumen de **2-3 líneas** de qué hiciste y qué archivos cambiaron. Nada más — no repitas el diff.
- **Preferí soluciones simples**: la opción más directa que resuelva el caso real. No agregues abstracciones, capas, ni configuraciones para escenarios hipotéticos. Tres líneas repetidas son mejores que una abstracción prematura.

## Stack del proyecto

Monorepo con dos workspaces: `backend/` (Express + SQLite, no desplegado) y `frontend/` (React + Vite, desplegado en Vercel desde Root Directory `frontend/`).

### Frontend (`frontend/`)
- **Runtime/build**: React 19.2 + ReactDOM 19.2, Vite 8, ES Modules (`"type": "module"`), JS (no TS)
- **Plugin Vite**: `@vitejs/plugin-react` 6
- **Routing**: react-router-dom 7
- **HTTP**: axios 1.15
- **i18n**: i18next 26 + react-i18next 17
- **Charts**: recharts 3.8
- **PDFs**: jspdf 4.2 + jspdf-autotable 5
- **Lint**: ESLint 9 + `@eslint/js`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`
- **Tipos**: `@types/react`, `@types/react-dom` (sólo para hints en JS)
- **PWA assets**: `manifest.json`, `apple-touch-icon.png`, `icons/`, `favicon.svg`
- **Output**: `frontend/dist/`
- **Hosting**: Vercel — `frontend/vercel.json` con rewrite `/(.*) → /index.html` (SPA fallback)

### Backend (`backend/`)
- **Runtime**: Node.js + Express 5.2
- **DB**: SQLite via `better-sqlite3` 12.9 (archivo local `gigclear.db`)
- **Auth**: jsonwebtoken 9 + bcryptjs 3
- **Otros**: cors 2.8, dotenv 17
- **Estructura**: `server.js`, `routes/`, `middleware/`, `db.js`
- **Scripts**: `start` (`node server.js`), `dev` (`node --watch server.js`)
- **Deploy**: ninguno configurado

### Raíz
- `package.json` con scripts orquestadores: `backend`, `frontend`, `install:all`
