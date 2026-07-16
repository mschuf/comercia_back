# Comercia Agent Guide

## ⚠️ Git: regla CRÍTICA para agentes IA (Claude, Codex, y cualquier otro)

- **NUNCA hacer `git commit` ni `git push` sin que el usuario lo pida explícitamente
  en ese momento.** Dejar los cambios en el working tree y avisar que están listos.
- **Un push a `main` DESPLIEGA AUTOMÁTICAMENTE A PRODUCCIÓN**: el pipeline construye
  las imágenes y el servidor las instala solo en ~3 minutos. Un push con errores
  puede tumbar la aplicación en producción.
- Si el usuario pide "commit", eso NO incluye push (pedirlo aparte).
- Nunca usar `--force`, ni tocar el historial de `main`.

## Stack

- Frontend: Next.js App Router in `apps/web`, TypeScript, Tailwind CSS.
- Backend: NestJS in `apps/api`, Prisma 7, PostgreSQL.
- Local DB: Docker Compose service `postgres`.

## Commands

- Install: `npm install`
- Full dev: `npm run dev`
- API only: `npm run dev:api`
- Web only: `npm run dev:web`
- Build: `npm run build`
- Lint: `npm run lint`
- API tests: `npm run test`
- DB up: `npm run db:up`
- Prisma generate: `npm run prisma:generate`
- Prisma migrate: `npm run prisma:migrate`

## Servidores locales: apagado obligatorio para agentes

- El backend y el frontend pueden levantarse temporalmente para pruebas manuales
  o de integración (`npm run dev`, `npm run dev:api`, `npm run dev:web`).
- **Antes de entregar la respuesta final, detener siempre cualquier instancia
  local del backend o frontend de este repositorio**, incluso si ya estaba
  encendida al comenzar la tarea, salvo que el usuario pida explícitamente
  mantenerla activa.
- Verificar al final que no haya listeners de Comercia en los puertos `3000`
  (Next.js) ni `3001` (NestJS). Un build o una prueba no justifica dejar un
  servidor ejecutándose en segundo plano.
- No detener procesos ajenos: antes de apagar un PID, comprobar que corresponde
  a este workspace o a sus puertos locales `3000`/`3001`.

## Frontend Rules

- Read `apps/web/AGENTS.md` before changing Next.js code.
- Use `.agents/skills/vercel-react-best-practices` for React/Next performance guidance.
- Prefer Server Components unless interactivity requires `"use client"`.
- Keep data access server-side. Never expose secrets or raw private records to Client Components.
- Use DTO-shaped props for client UI and validate all input from params, search params, forms, and actions.
- Avoid barrel imports and heavy client bundles; import directly and defer expensive client code.

## Reglas de exposición de datos en endpoints (OBLIGATORIAS para todo endpoint nuevo)

- **Nunca devolver entidades de Prisma "enteras"**: cada respuesta usa un DTO
  explícito con la lista mínima de campos que el front necesita (patrón
  `aSesion()` de `auth.service.ts`). `passwordHash`, `password_db` de
  conexiones, tokens y campos internos JAMÁS salen por la API.
- **Todo endpoint nuevo lleva `JwtAuthGuard`** salvo justificación escrita en un
  comentario. Los únicos públicos permitidos hoy: `health` y `auth/login`.
  El alta de usuarios se realiza desde el ABM autenticado de usuarios.
- **Autenticado ≠ autorizado**: además del guard, verificar DENTRO del handler
  que el recurso pertenezca al usuario o a su alcance (su empresa, su equipo,
  sus clientes). Un vendedor no ve los datos de otro vendedor.
- Al agregar campos a un modelo, **revisar los DTOs**: un campo nuevo NO viaja
  al front por defecto — se agrega al DTO solo si el front lo necesita.
- Los mensajes de error no revelan existencia de datos (ej. el login dice
  "Usuario o contraseña incorrectos", nunca "ese usuario no existe").
- Swagger solo en desarrollo (`SWAGGER_ENABLED=false` en producción).
- Nota de realidad: los endpoints y SUS PROPIOS datos siempre serán visibles
  para el usuario logueado en su navegador (DevTools) — eso es inevitable y
  correcto. La seguridad es autenticación + autorización + DTO mínimo, nunca
  esconder URLs.

## Reglas de paginación (OBLIGATORIAS para todo endpoint de listado)

- **Todo endpoint que devuelva una lista se pagina SIEMPRE** usando el helper
  estándar `apps/api/src/common/paginacion.ts`: el DTO extiende/incluye
  `PaginacionDto` (`?page=X&limit=Y`), Prisma recibe `skip/take` de
  `rangoPaginacion()`, y la respuesta se arma con `respuestaPaginada()` →
  `{ items, total, page, limit, totalPages }`.
- **Default 7 registros por página, máximo 50** (constantes del helper — no
  hardcodear otros valores).
- Prohibido `findMany` sin `take` en endpoints que respondan al front.
- El front consume esto con el componente `apps/web/src/components/paginacion.tsx`
  y el tipo `RespuestaPaginada<T>` (regla espejo en `apps/web/AGENTS.md`).

## Organización del código del backend (OBLIGATORIA)

- **Interfaces y tipos** NO se definen dentro de un service/controller/guard: van
  en una carpeta `interfaces/` del módulo, un archivo por concepto con sufijo
  `.interface.ts` (ej. `auth/interfaces/usuario-sesion.interface.ts`,
  `plataforma/interfaces/asignacion.interface.ts`). Los DTOs de ENTRADA
  (clases con class-validator) van en `dto/`.
- **Funciones puras** (validaciones, hashing, formateo, transforms — sin estado
  ni dependencias de Nest) van en una carpeta `utils/`, un archivo por tema
  (`auth/utils/ruc.ts`, `auth/utils/password.ts`, `common/utils/transforms.ts`).
  No usar el sufijo `.util.ts` suelto en la raíz del módulo.
- Lo compartido entre módulos vive en `common/` (`common/utils/`,
  `common/interfaces/`). Sin duplicar helpers entre módulos: si dos lo usan, va a `common`.
- Imports directos, sin archivos barrel (`index.ts` re-exportador).

## Backend Rules

- Keep validation at the edge: DTOs plus global `ValidationPipe`.
- Never trust request payloads, params, headers, cookies, or query strings without validation.
- Add authentication and authorization checks inside every mutation/action endpoint, not only at controller level.
- Use Prisma migrations for schema changes. Do not hand-edit generated Prisma client files.
- Prefer Prisma parameterized APIs. If raw SQL is unavoidable, use Prisma tagged templates only.
- Keep secrets in `.env`; do not commit `.env`.
- Preserve CORS allowlists, Helmet, rate limiting, and payload limits unless a change has a clear security reason.

## Project Style

- Keep code small and explicit until repeated patterns justify abstraction.
- Prefer existing framework conventions over custom infrastructure.
- Add tests when changing behavior, especially controller/service contracts and security-sensitive logic.
