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

## Frontend Rules

- Read `apps/web/AGENTS.md` before changing Next.js code.
- Use `.agents/skills/vercel-react-best-practices` for React/Next performance guidance.
- Prefer Server Components unless interactivity requires `"use client"`.
- Keep data access server-side. Never expose secrets or raw private records to Client Components.
- Use DTO-shaped props for client UI and validate all input from params, search params, forms, and actions.
- Avoid barrel imports and heavy client bundles; import directly and defer expensive client code.

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
