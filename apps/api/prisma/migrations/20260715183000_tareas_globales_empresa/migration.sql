-- Una tarea maestra por empresa sincroniza el mismo checklist hacia todos sus
-- clientes/locales sin perder los IDs respondidos en visitas anteriores.
CREATE TABLE "tareas_globales" (
  "id" SERIAL NOT NULL,
  "empresa_id" INTEGER NOT NULL,
  "descripcion" TEXT NOT NULL,
  "requiere_foto" BOOLEAN NOT NULL DEFAULT false,
  "orden" INTEGER NOT NULL DEFAULT 0,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creado_por_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tareas_globales_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tareas_globales_empresa_id_descripcion_key"
  ON "tareas_globales"("empresa_id", "descripcion");

ALTER TABLE "tareas_globales"
  ADD CONSTRAINT "tareas_globales_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tareas_globales"
  ADD CONSTRAINT "tareas_globales_creado_por_id_fkey"
  FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tareas_cliente" ADD COLUMN "tarea_global_id" INTEGER;

-- Convierte checklists existentes agrupando por empresa + descripción. Si
-- antes diferían entre clientes, prevalece la exigencia más estricta de foto.
INSERT INTO "tareas_globales" (
  "empresa_id", "descripcion", "requiere_foto", "orden", "activo",
  "creado_por_id", "created_at", "updated_at"
)
SELECT
  c."empresa_id",
  tc."descripcion",
  bool_or(tc."requiere_foto"),
  min(tc."orden"),
  bool_or(tc."activo"),
  min(c."creado_por_id"),
  min(tc."created_at"),
  now()
FROM "tareas_cliente" tc
JOIN "clientes" c ON c."id" = tc."cliente_id"
GROUP BY c."empresa_id", tc."descripcion"
ON CONFLICT ("empresa_id", "descripcion") DO NOTHING;

UPDATE "tareas_cliente" tc
SET
  "tarea_global_id" = tg."id",
  "requiere_foto" = tg."requiere_foto",
  "orden" = tg."orden",
  "activo" = tg."activo",
  "updated_at" = now()
FROM "clientes" c, "tareas_globales" tg
WHERE c."id" = tc."cliente_id"
  AND tg."empresa_id" = c."empresa_id"
  AND tg."descripcion" = tc."descripcion";

-- Si dos tareas iguales existían dentro del mismo cliente, conserva una
-- enlazada a la maestra y deja las demás como legado para no borrar historial.
WITH repetidas AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "cliente_id", "tarea_global_id" ORDER BY "id"
    ) AS numero
  FROM "tareas_cliente"
  WHERE "tarea_global_id" IS NOT NULL
)
UPDATE "tareas_cliente" tc
SET "tarea_global_id" = NULL
FROM repetidas r
WHERE r."id" = tc."id" AND r.numero > 1;

CREATE UNIQUE INDEX "tareas_cliente_cliente_id_tarea_global_id_key"
  ON "tareas_cliente"("cliente_id", "tarea_global_id");

ALTER TABLE "tareas_cliente"
  ADD CONSTRAINT "tareas_cliente_tarea_global_id_fkey"
  FOREIGN KEY ("tarea_global_id") REFERENCES "tareas_globales"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Completa la tarea en cualquier cliente que no la tuviera.
INSERT INTO "tareas_cliente" (
  "cliente_id", "tarea_global_id", "descripcion", "requiere_foto", "orden",
  "activo", "created_at", "updated_at"
)
SELECT
  c."id", tg."id", tg."descripcion", tg."requiere_foto", tg."orden",
  tg."activo", now(), now()
FROM "clientes" c
JOIN "tareas_globales" tg ON tg."empresa_id" = c."empresa_id"
ON CONFLICT ("cliente_id", "tarea_global_id") DO NOTHING;

-- ABM propio en el menú: Mapa, Locales, Tareas, Visitas.
INSERT INTO "paginas" (
  "modulo_id", "nombre", "ruta", "icono", "orden", "activo",
  "created_at", "updated_at"
)
SELECT m."id", 'Tareas', 'tareas', 'tareas', 3, true, now(), now()
FROM "modulos" m
WHERE m."ruta" = 'impulsador'
ON CONFLICT ("modulo_id", "ruta") DO UPDATE
SET "nombre" = EXCLUDED."nombre",
    "icono" = EXCLUDED."icono",
    "orden" = EXCLUDED."orden",
    "activo" = true,
    "updated_at" = now();

UPDATE "paginas" p
SET "orden" = CASE p."ruta"
  WHEN 'mapa' THEN 1
  WHEN 'locales' THEN 2
  WHEN 'tareas' THEN 3
  WHEN 'visitas' THEN 4
END,
"updated_at" = now()
FROM "modulos" m
WHERE p."modulo_id" = m."id"
  AND m."ruta" = 'impulsador'
  AND p."ruta" IN ('mapa', 'locales', 'tareas', 'visitas');
