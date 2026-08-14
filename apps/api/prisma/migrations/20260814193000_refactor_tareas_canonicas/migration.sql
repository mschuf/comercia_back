-- Una tarea pasa a ser una definicion canonica con alcances dinamicos. La
-- migracion conserva las respuestas historicas y elimina las copias por cliente.
CREATE TYPE "AlcanceUsuariosTarea" AS ENUM (
  'EMPRESA',
  'EQUIPO_DIRECTO',
  'EQUIPO_COMPLETO',
  'SELECCIONADOS'
);

CREATE TYPE "AlcanceLocalesTarea" AS ENUM (
  'TODOS',
  'CLIENTE',
  'SELECCIONADOS'
);

CREATE TYPE "EfectoTareaUsuario" AS ENUM ('INCLUIR', 'EXCLUIR');

DROP INDEX "tareas_globales_empresa_id_titulo_key";

ALTER TABLE "tareas_globales" RENAME TO "tareas";
ALTER TABLE "tareas" RENAME CONSTRAINT "tareas_globales_pkey" TO "tareas_pkey";
ALTER TABLE "tareas" RENAME CONSTRAINT "tareas_globales_empresa_id_fkey" TO "tareas_empresa_id_fkey";
ALTER TABLE "tareas" RENAME CONSTRAINT "tareas_globales_creado_por_id_fkey" TO "tareas_creado_por_id_fkey";
ALTER TABLE "tareas" RENAME COLUMN "alcance" TO "alcance_usuarios";

ALTER TABLE "tareas" ALTER COLUMN "alcance_usuarios" DROP DEFAULT;
ALTER TABLE "tareas"
  ALTER COLUMN "alcance_usuarios" TYPE "AlcanceUsuariosTarea"
  USING (
    CASE "alcance_usuarios"::text
      WHEN 'SELECCIONADOS' THEN 'SELECCIONADOS'
      ELSE 'EQUIPO_COMPLETO'
    END
  )::"AlcanceUsuariosTarea";
ALTER TABLE "tareas"
  ALTER COLUMN "alcance_usuarios" SET DEFAULT 'EQUIPO_COMPLETO';

ALTER TABLE "tareas" ALTER COLUMN "alcance_locales" DROP DEFAULT;
ALTER TABLE "tareas"
  ALTER COLUMN "alcance_locales" TYPE "AlcanceLocalesTarea"
  USING "alcance_locales"::text::"AlcanceLocalesTarea";
ALTER TABLE "tareas"
  ALTER COLUMN "alcance_locales" SET DEFAULT 'TODOS';

ALTER TABLE "tareas"
  ADD COLUMN "equipo_raiz_id" INTEGER,
  ADD COLUMN "cliente_id" INTEGER,
  ADD COLUMN "vigente_desde" TIMESTAMP(3),
  ADD COLUMN "vigente_hasta" TIMESTAMP(3);

-- En la operacion de impulsadores, TODOS significaba el equipo completo del
-- creador. En los modulos historicos de repositores significaba toda la empresa.
UPDATE "tareas" AS tarea
SET "equipo_raiz_id" = tarea."creado_por_id"
FROM "usuarios" AS creador
LEFT JOIN "roles" AS rol ON rol."id" = creador."rol_id"
WHERE creador."id" = tarea."creado_por_id"
  AND tarea."alcance_usuarios" = 'EQUIPO_COMPLETO'
  AND rol."descripcion" IN ('supervisor.impulsador', 'teamleader.impulsador');

UPDATE "tareas" AS tarea
SET "alcance_usuarios" = 'EMPRESA'
FROM "usuarios" AS creador
LEFT JOIN "roles" AS rol ON rol."id" = creador."rol_id"
WHERE creador."id" = tarea."creado_por_id"
  AND tarea."alcance_usuarios" = 'EQUIPO_COMPLETO'
  AND (
    rol."descripcion" IS NULL
    OR rol."descripcion" NOT IN (
      'supervisor.impulsador',
      'teamleader.impulsador'
    )
  );

ALTER TABLE "tareas"
  ADD CONSTRAINT "tareas_equipo_raiz_id_fkey"
    FOREIGN KEY ("equipo_raiz_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tareas_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "tareas_alcance_equipo_check"
    CHECK (
      ("alcance_usuarios" IN ('EQUIPO_DIRECTO', 'EQUIPO_COMPLETO') AND "equipo_raiz_id" IS NOT NULL)
      OR
      ("alcance_usuarios" NOT IN ('EQUIPO_DIRECTO', 'EQUIPO_COMPLETO') AND "equipo_raiz_id" IS NULL)
    ),
  ADD CONSTRAINT "tareas_alcance_cliente_check"
    CHECK (
      ("alcance_locales" = 'CLIENTE' AND "cliente_id" IS NOT NULL)
      OR
      ("alcance_locales" <> 'CLIENTE' AND "cliente_id" IS NULL)
    ),
  ADD CONSTRAINT "tareas_vigencia_check"
    CHECK (
      "vigente_hasta" IS NULL
      OR "vigente_desde" IS NULL
      OR "vigente_hasta" >= "vigente_desde"
    );

CREATE INDEX "tareas_empresa_id_activo_orden_idx"
  ON "tareas"("empresa_id", "activo", "orden");
CREATE INDEX "tareas_equipo_raiz_id_alcance_usuarios_idx"
  ON "tareas"("equipo_raiz_id", "alcance_usuarios");
CREATE INDEX "tareas_cliente_id_alcance_locales_idx"
  ON "tareas"("cliente_id", "alcance_locales");

-- Mapa temporal entre las copias antiguas y la tarea canonica. Las copias que
-- ya tenian una global convergen en ella; los checklists propios de un cliente
-- se convierten en nuevas tareas con alcance CLIENTE.
CREATE TEMP TABLE "_migracion_tarea_cliente" (
  "tarea_cliente_id" INTEGER PRIMARY KEY,
  "tarea_id" INTEGER NOT NULL
);

INSERT INTO "_migracion_tarea_cliente" ("tarea_cliente_id", "tarea_id")
SELECT "id", "tarea_global_id"
FROM "tareas_cliente"
WHERE "tarea_global_id" IS NOT NULL;

INSERT INTO "_migracion_tarea_cliente" ("tarea_cliente_id", "tarea_id")
SELECT
  "id",
  nextval(pg_get_serial_sequence('tareas', 'id'))::integer
FROM "tareas_cliente"
WHERE "tarea_global_id" IS NULL;

INSERT INTO "tareas" (
  "id",
  "empresa_id",
  "titulo",
  "descripcion",
  "requiere_foto",
  "alcance_usuarios",
  "equipo_raiz_id",
  "alcance_locales",
  "cliente_id",
  "orden",
  "activo",
  "creado_por_id",
  "created_at",
  "updated_at"
)
SELECT
  mapa."tarea_id",
  cliente."empresa_id",
  copia."titulo",
  copia."descripcion",
  copia."requiere_foto",
  'EMPRESA',
  NULL,
  'CLIENTE',
  copia."cliente_id",
  copia."orden",
  copia."activo",
  cliente."creado_por_id",
  copia."created_at",
  copia."updated_at"
FROM "tareas_cliente" AS copia
INNER JOIN "_migracion_tarea_cliente" AS mapa
  ON mapa."tarea_cliente_id" = copia."id"
INNER JOIN "clientes" AS cliente
  ON cliente."id" = copia."cliente_id"
WHERE copia."tarea_global_id" IS NULL;

-- Unifica destinatarios y exclusiones en una sola relacion con precedencia.
ALTER TABLE "tareas_globales_usuario" RENAME TO "tarea_usuarios";
ALTER TABLE "tarea_usuarios" RENAME CONSTRAINT "tareas_globales_usuario_pkey" TO "tarea_usuarios_pkey";
ALTER TABLE "tarea_usuarios" RENAME CONSTRAINT "tareas_globales_usuario_tarea_global_id_fkey" TO "tarea_usuarios_tarea_id_fkey";
ALTER TABLE "tarea_usuarios" RENAME CONSTRAINT "tareas_globales_usuario_usuario_id_fkey" TO "tarea_usuarios_usuario_id_fkey";
ALTER TABLE "tarea_usuarios" RENAME COLUMN "tarea_global_id" TO "tarea_id";
DROP INDEX "tareas_globales_usuario_tarea_global_id_usuario_id_key";
DROP INDEX "tareas_globales_usuario_usuario_id_tarea_global_id_idx";

ALTER TABLE "tarea_usuarios"
  ADD COLUMN "efecto" "EfectoTareaUsuario" NOT NULL DEFAULT 'INCLUIR',
  ADD COLUMN "registrado_por_id" INTEGER,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "tarea_usuarios" AS asignacion
SET "registrado_por_id" = tarea."creado_por_id"
FROM "tareas" AS tarea
WHERE tarea."id" = asignacion."tarea_id";

ALTER TABLE "tarea_usuarios"
  ALTER COLUMN "registrado_por_id" SET NOT NULL,
  ADD CONSTRAINT "tarea_usuarios_registrado_por_id_fkey"
    FOREIGN KEY ("registrado_por_id") REFERENCES "usuarios"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "tarea_usuarios_tarea_id_usuario_id_key"
  ON "tarea_usuarios"("tarea_id", "usuario_id");
CREATE INDEX "tarea_usuarios_usuario_id_efecto_tarea_id_idx"
  ON "tarea_usuarios"("usuario_id", "efecto", "tarea_id");
CREATE INDEX "tarea_usuarios_registrado_por_id_idx"
  ON "tarea_usuarios"("registrado_por_id");

INSERT INTO "tarea_usuarios" (
  "tarea_id",
  "usuario_id",
  "efecto",
  "registrado_por_id",
  "created_at",
  "updated_at"
)
SELECT
  "tarea_global_id",
  "usuario_id",
  'EXCLUIR',
  "excluido_por_id",
  "created_at",
  "created_at"
FROM "tareas_globales_exclusion_usuario"
ON CONFLICT ("tarea_id", "usuario_id") DO UPDATE SET
  "efecto" = 'EXCLUIR',
  "registrado_por_id" = EXCLUDED."registrado_por_id",
  "updated_at" = EXCLUDED."updated_at";

INSERT INTO "tarea_usuarios" (
  "tarea_id",
  "usuario_id",
  "efecto",
  "registrado_por_id",
  "created_at",
  "updated_at"
)
SELECT
  mapa."tarea_id",
  exclusion."usuario_id",
  'EXCLUIR',
  exclusion."excluido_por_id",
  exclusion."created_at",
  exclusion."created_at"
FROM "tareas_cliente_exclusion_usuario" AS exclusion
INNER JOIN "_migracion_tarea_cliente" AS mapa
  ON mapa."tarea_cliente_id" = exclusion."tarea_cliente_id"
ON CONFLICT ("tarea_id", "usuario_id") DO UPDATE SET
  "efecto" = 'EXCLUIR',
  "registrado_por_id" = EXCLUDED."registrado_por_id",
  "updated_at" = EXCLUDED."updated_at";

ALTER TABLE "tarea_usuarios" ALTER COLUMN "efecto" DROP DEFAULT;

DROP TABLE "tareas_globales_exclusion_usuario";
DROP TABLE "tareas_cliente_exclusion_usuario";

ALTER TABLE "tareas_globales_local" RENAME TO "tarea_locales";
ALTER TABLE "tarea_locales" RENAME CONSTRAINT "tareas_globales_local_pkey" TO "tarea_locales_pkey";
ALTER TABLE "tarea_locales" RENAME CONSTRAINT "tareas_globales_local_tarea_global_id_fkey" TO "tarea_locales_tarea_id_fkey";
ALTER TABLE "tarea_locales" RENAME CONSTRAINT "tareas_globales_local_local_id_fkey" TO "tarea_locales_local_id_fkey";
ALTER TABLE "tarea_locales" RENAME COLUMN "tarea_global_id" TO "tarea_id";
DROP INDEX "tareas_globales_local_tarea_global_id_local_id_key";
DROP INDEX "tareas_globales_local_local_id_tarea_global_id_idx";
CREATE UNIQUE INDEX "tarea_locales_tarea_id_local_id_key"
  ON "tarea_locales"("tarea_id", "local_id");
CREATE INDEX "tarea_locales_local_id_tarea_id_idx"
  ON "tarea_locales"("local_id", "tarea_id");

-- Materializa la definicion que vio el usuario antes de cambiar la referencia.
ALTER TABLE "visita_tareas"
  ADD COLUMN "titulo_snapshot" TEXT,
  ADD COLUMN "descripcion_snapshot" TEXT,
  ADD COLUMN "requiere_foto_snapshot" BOOLEAN,
  ADD COLUMN "orden_snapshot" INTEGER,
  ADD COLUMN "activa_snapshot" BOOLEAN NOT NULL DEFAULT true;

UPDATE "visita_tareas" AS respuesta
SET
  "titulo_snapshot" = copia."titulo",
  "descripcion_snapshot" = copia."descripcion",
  "requiere_foto_snapshot" = copia."requiere_foto",
  "orden_snapshot" = copia."orden",
  "activa_snapshot" = copia."activo"
FROM "tareas_cliente" AS copia
WHERE copia."id" = respuesta."tarea_id";

ALTER TABLE "visita_tareas"
  ALTER COLUMN "titulo_snapshot" SET NOT NULL,
  ALTER COLUMN "descripcion_snapshot" SET NOT NULL,
  ALTER COLUMN "requiere_foto_snapshot" SET NOT NULL,
  ALTER COLUMN "orden_snapshot" SET NOT NULL;

ALTER TABLE "visita_tareas" DROP CONSTRAINT "visita_tareas_tarea_id_fkey";

UPDATE "visita_tareas" AS respuesta
SET "tarea_id" = mapa."tarea_id"
FROM "_migracion_tarea_cliente" AS mapa
WHERE mapa."tarea_cliente_id" = respuesta."tarea_id";

ALTER TABLE "visita_tareas"
  ADD CONSTRAINT "visita_tareas_tarea_id_fkey"
    FOREIGN KEY ("tarea_id") REFERENCES "tareas"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "visita_tareas_tarea_id_idx" ON "visita_tareas"("tarea_id");

DROP TABLE "tareas_cliente";
DROP TYPE "AlcanceTarea";
