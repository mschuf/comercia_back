---
type: "query"
date: "2026-08-14T12:11:05.856179+00:00"
question: "migration.sql se ejecuta automaticamente cuando hago el commit o yo tengo que hacerlo?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["DEPLOY.md", "prisma:deploy", "guard-migrate.mjs", "Deployment"]
---

# Q: migration.sql se ejecuta automaticamente cuando hago el commit o yo tengo que hacerlo?

## Answer

Consulta ampliada con vocabulario del grafo: [migration, migrate, prisma, deploy, deployment, production, server, script]. Un commit local no ejecuta la migracion. Cuando el commit que incluye apps/api/prisma/migrations se sube con push a main, GitHub construye la imagen de API; el servidor LAN detecta la nueva imagen cada 3 minutos, ejecuta docker compose up y el servicio migrate corre npm run prisma:deploy antes de permitir que arranque la API. La base local requiere aplicacion manual y no debe usarse prisma migrate dev contra produccion.

## Outcome

- Signal: useful

## Source Nodes

- DEPLOY.md
- prisma:deploy
- guard-migrate.mjs
- Deployment