-- `fecha_visita` es TIMESTAMP sin zona y Prisma la persiste en UTC. La
-- migración anterior la interpretaba como hora local al crear la agenda.
UPDATE "programaciones_visita" programacion
SET
  "fecha_inicio" = (
    local."fecha_visita" AT TIME ZONE 'UTC'
    AT TIME ZONE programacion."zona_horaria"
  )::DATE,
  "horarios" = ARRAY[
    to_char(
      local."fecha_visita" AT TIME ZONE 'UTC'
      AT TIME ZONE programacion."zona_horaria",
      'HH24:MI'
    )
  ],
  "updated_at" = CURRENT_TIMESTAMP
FROM "locales" local
WHERE programacion."local_id" = local."id"
  AND programacion."frecuencia" = 'UNICA'
  AND local."fecha_visita" IS NOT NULL;
