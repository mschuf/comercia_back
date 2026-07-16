BEGIN;

CREATE TYPE "FrecuenciaVisita" AS ENUM ('UNICA', 'SEMANAL', 'MENSUAL');

CREATE TABLE "programaciones_visita" (
  "id" SERIAL NOT NULL,
  "local_id" INTEGER NOT NULL,
  "frecuencia" "FrecuenciaVisita" NOT NULL,
  "fecha_inicio" DATE NOT NULL,
  "fecha_fin" DATE,
  "intervalo" INTEGER NOT NULL DEFAULT 1,
  "dias_semana" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "dias_mes" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  "horarios" TEXT[] NOT NULL,
  "zona_horaria" TEXT NOT NULL DEFAULT 'America/Asuncion',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "programaciones_visita_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "programaciones_visita_local_id_key"
  ON "programaciones_visita"("local_id");

ALTER TABLE "programaciones_visita"
  ADD CONSTRAINT "programaciones_visita_local_id_fkey"
  FOREIGN KEY ("local_id") REFERENCES "locales"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Convierte las fechas simples existentes para que también puedan editarse
-- desde la nueva agenda. La próxima fecha se conserva sin cambios.
INSERT INTO "programaciones_visita" (
  "local_id",
  "frecuencia",
  "fecha_inicio",
  "intervalo",
  "dias_semana",
  "dias_mes",
  "horarios",
  "zona_horaria",
  "activo"
)
SELECT
  "id",
  'UNICA'::"FrecuenciaVisita",
  ("fecha_visita" AT TIME ZONE 'America/Asuncion')::DATE,
  1,
  ARRAY[]::INTEGER[],
  ARRAY[]::INTEGER[],
  ARRAY[to_char("fecha_visita" AT TIME ZONE 'America/Asuncion', 'HH24:MI')],
  'America/Asuncion',
  true
FROM "locales"
WHERE "fecha_visita" IS NOT NULL;

COMMIT;
