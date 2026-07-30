-- Una novedad es la salida excepcional de una tarea que el repositor no pudo
-- completar. El mismo registro conserva la evidencia y notifica al supervisor.
CREATE TABLE "novedades_tarea" (
    "id" SERIAL NOT NULL,
    "visita_tarea_id" INTEGER NOT NULL,
    "reportado_por_id" INTEGER NOT NULL,
    "supervisor_id" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL,
    "foto" TEXT NOT NULL,
    "reportada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leida_en" TIMESTAMP(3),

    CONSTRAINT "novedades_tarea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "novedades_tarea_visita_tarea_id_key"
ON "novedades_tarea"("visita_tarea_id");

CREATE INDEX "novedades_tarea_supervisor_id_leida_en_reportada_en_idx"
ON "novedades_tarea"("supervisor_id", "leida_en", "reportada_en");

ALTER TABLE "novedades_tarea"
ADD CONSTRAINT "novedades_tarea_visita_tarea_id_fkey"
FOREIGN KEY ("visita_tarea_id") REFERENCES "visita_tareas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "novedades_tarea"
ADD CONSTRAINT "novedades_tarea_reportado_por_id_fkey"
FOREIGN KEY ("reportado_por_id") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "novedades_tarea"
ADD CONSTRAINT "novedades_tarea_supervisor_id_fkey"
FOREIGN KEY ("supervisor_id") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
