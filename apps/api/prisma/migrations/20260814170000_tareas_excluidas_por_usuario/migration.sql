-- Permite quitar las tareas de una persona sin desactivar la definición
-- compartida ni afectar a los demás integrantes del equipo.
CREATE TABLE "tareas_globales_exclusion_usuario" (
  "id" SERIAL PRIMARY KEY,
  "tarea_global_id" INTEGER NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "excluido_por_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tareas_globales_exclusion_usuario_tarea_global_id_fkey"
    FOREIGN KEY ("tarea_global_id") REFERENCES "tareas_globales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tareas_globales_exclusion_usuario_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tareas_globales_exclusion_usuario_excluido_por_id_fkey"
    FOREIGN KEY ("excluido_por_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tareas_globales_exclusion_usuario_tarea_global_id_usuario_id_key"
  ON "tareas_globales_exclusion_usuario"("tarea_global_id", "usuario_id");
CREATE INDEX "tareas_globales_exclusion_usuario_usuario_id_tarea_global_id_idx"
  ON "tareas_globales_exclusion_usuario"("usuario_id", "tarea_global_id");
CREATE INDEX "tareas_globales_exclusion_usuario_excluido_por_id_idx"
  ON "tareas_globales_exclusion_usuario"("excluido_por_id");

-- Las tareas antiguas o creadas directamente dentro de un cliente no tienen
-- tarea_global_id. Esta segunda exclusión cubre también esos checklists.
CREATE TABLE "tareas_cliente_exclusion_usuario" (
  "id" SERIAL PRIMARY KEY,
  "tarea_cliente_id" INTEGER NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "excluido_por_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tareas_cliente_exclusion_usuario_tarea_cliente_id_fkey"
    FOREIGN KEY ("tarea_cliente_id") REFERENCES "tareas_cliente"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tareas_cliente_exclusion_usuario_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tareas_cliente_exclusion_usuario_excluido_por_id_fkey"
    FOREIGN KEY ("excluido_por_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tareas_cliente_exclusion_usuario_tarea_cliente_id_usuario_id_key"
  ON "tareas_cliente_exclusion_usuario"("tarea_cliente_id", "usuario_id");
CREATE INDEX "tareas_cliente_exclusion_usuario_usuario_id_tarea_cliente_id_idx"
  ON "tareas_cliente_exclusion_usuario"("usuario_id", "tarea_cliente_id");
CREATE INDEX "tareas_cliente_exclusion_usuario_excluido_por_id_idx"
  ON "tareas_cliente_exclusion_usuario"("excluido_por_id");
