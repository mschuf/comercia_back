---
name: comercia-fullstack-best-practices
description: Use when working on the Comercia Next.js + NestJS + PostgreSQL monorepo to preserve local architecture, security, and agent conventions.
license: MIT
---

# Comercia Fullstack Best Practices

Use this skill before editing the Comercia project.

## Frontend

- Follow `apps/web/AGENTS.md` and the installed Vercel skill at `.agents/skills/vercel-react-best-practices`.
- Prefer Server Components, small DTO props, direct imports, and minimal client JavaScript.
- Keep secrets and privileged data out of Client Components.
- Validate user-controlled params, search params, form fields, and server action inputs.

## Backend

- Keep `ConfigModule`, Zod env validation, Helmet, CORS allowlists, rate limiting, payload limits, and global validation active.
- Use DTOs and validation pipes at API boundaries.
- Use Prisma migrations for schema changes and never edit generated Prisma client files.
- Use authorization checks per resource for every mutation, not just authentication checks.
- Do not commit `.env` values or production secrets.

## Verification

- Run `npm run build` for cross-app compilation.
- Run `npm run test` for API unit tests.
- Run `npm run prisma:generate` after Prisma schema edits.
