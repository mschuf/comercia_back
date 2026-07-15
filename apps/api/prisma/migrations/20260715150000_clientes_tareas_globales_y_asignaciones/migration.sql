-- Cliente comercial separado del local físico.
CREATE TABLE "clientes" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion_tareas" TEXT NOT NULL DEFAULT '',
    "imagen_referencia" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clientes_empresa_id_nombre_key"
ON "clientes"("empresa_id", "nombre");

ALTER TABLE "clientes"
ADD CONSTRAINT "clientes_empresa_id_fkey"
FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clientes"
ADD CONSTRAINT "clientes_creado_por_id_fkey"
FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Conserva los datos actuales: cada nombre de local pasa a ser un cliente y
-- los locales homónimos de una empresa quedan agrupados bajo ese cliente.
INSERT INTO "clientes" (
    "empresa_id", "nombre", "creado_por_id", "created_at", "updated_at"
)
SELECT
    l."empresa_id",
    l."nombre",
    MIN(l."creado_por_id"),
    MIN(l."created_at"),
    now()
FROM "locales" AS l
GROUP BY l."empresa_id", l."nombre";

ALTER TABLE "locales" ADD COLUMN "cliente_id" INTEGER;

UPDATE "locales" AS l
SET "cliente_id" = c."id"
FROM "clientes" AS c
WHERE c."empresa_id" = l."empresa_id"
  AND c."nombre" = l."nombre";

ALTER TABLE "locales" ALTER COLUMN "cliente_id" SET NOT NULL;

ALTER TABLE "locales"
ADD CONSTRAINT "locales_cliente_id_fkey"
FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- El checklist deja de pertenecer al local y pasa a pertenecer al cliente.
-- Se preservan los IDs, por lo que las respuestas históricas siguen apuntando
-- a la misma tarea después del cambio.
ALTER TABLE "tareas_local" ADD COLUMN "cliente_id" INTEGER;

UPDATE "tareas_local" AS t
SET "cliente_id" = l."cliente_id"
FROM "locales" AS l
WHERE l."id" = t."local_id";

ALTER TABLE "tareas_local" ALTER COLUMN "cliente_id" SET NOT NULL;
ALTER TABLE "tareas_local" DROP CONSTRAINT "tareas_local_local_id_fkey";
ALTER TABLE "tareas_local" DROP COLUMN "local_id";
ALTER TABLE "tareas_local" RENAME TO "tareas_cliente";

ALTER TABLE "tareas_cliente"
ADD CONSTRAINT "tareas_cliente_cliente_id_fkey"
FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Responsable del territorio y varios repositores por zona.
ALTER TABLE "territorios" ADD COLUMN "responsable_id" INTEGER;

ALTER TABLE "territorios"
ADD CONSTRAINT "territorios_responsable_id_fkey"
FOREIGN KEY ("responsable_id") REFERENCES "usuarios"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "zona_usuarios" (
    "id" SERIAL NOT NULL,
    "zona_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "asignado_por_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "zona_usuarios_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zona_usuarios_zona_id_usuario_id_key"
ON "zona_usuarios"("zona_id", "usuario_id");

ALTER TABLE "zona_usuarios"
ADD CONSTRAINT "zona_usuarios_zona_id_fkey"
FOREIGN KEY ("zona_id") REFERENCES "zonas"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "zona_usuarios"
ADD CONSTRAINT "zona_usuarios_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "zona_usuarios"
ADD CONSTRAINT "zona_usuarios_asignado_por_id_fkey"
FOREIGN KEY ("asignado_por_id") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Los responsables ya asignados directamente a locales se incorporan a su
-- zona para que el nuevo control no invalide configuraciones existentes.
INSERT INTO "zona_usuarios" ("zona_id", "usuario_id", "asignado_por_id")
SELECT DISTINCT l."zona_id", l."usuario_id", l."creado_por_id"
FROM "locales" AS l
WHERE l."zona_id" IS NOT NULL
  AND l."usuario_id" IS NOT NULL
ON CONFLICT ("zona_id", "usuario_id") DO NOTHING;

-- Roles autorizados a administrar usuarios dentro de cada empresa.
ALTER TABLE "config_impulsador"
ADD COLUMN "rol_admin_usuario_ids" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
