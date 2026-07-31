-- Conserva la precisión reportada por el dispositivo para poder auditar la
-- calidad de la ubicación usada al iniciar y finalizar una visita.
ALTER TABLE "visitas"
ADD COLUMN "precision_metros" DOUBLE PRECISION,
ADD COLUMN "precision_fin_metros" DOUBLE PRECISION;

-- Snapshot diario por repositor. La firma de agenda permite reemplazarlo
-- automáticamente cuando cambian locales, horarios, tareas o visitas.
CREATE TABLE "rutas_diarias_repositor" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "fecha" VARCHAR(10) NOT NULL,
    "firma_agenda" VARCHAR(64) NOT NULL,
    "datos" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rutas_diarias_repositor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rutas_diarias_repositor_usuario_id_fecha_key"
ON "rutas_diarias_repositor"("usuario_id", "fecha");

CREATE INDEX "rutas_diarias_repositor_fecha_idx"
ON "rutas_diarias_repositor"("fecha");

ALTER TABLE "rutas_diarias_repositor"
ADD CONSTRAINT "rutas_diarias_repositor_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
