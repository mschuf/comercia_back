# Scripts SQL para producción

Carpeta de queries de DATOS que se aplican a mano en producción cuando el
usuario lo decide (los cambios de ESTRUCTURA no van acá: esos son migraciones
de Prisma en `apps/api/prisma/migrations/` y el deploy las aplica solo).

## Convenciones

- Un archivo por tanda: `AAAA-MM-DD_descripcion.sql`.
- **Idempotentes**: se pueden correr dos veces sin duplicar (usar
  `NOT EXISTS` / `ON CONFLICT`, y resolver ids por nombre — nunca hardcodear
  ids, que en producción pueden ser otros).
- Envueltos en `BEGIN; ... COMMIT;` para que fallen completos o nada.

## Cómo aplicar en producción

```bash
# Desde esta máquina (túnel SSH ya configurado con alias "comercia"):
ssh comercia "docker exec -i comercia-postgres-1 psql -U comercia -d comercia" < sql/ARCHIVO.sql
```

(o copiar el contenido y pegarlo en un psql abierto en el servidor)
