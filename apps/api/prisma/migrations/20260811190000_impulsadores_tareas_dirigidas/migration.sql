-- Roles y módulos específicos para la operación de impulsadores.
-- Los módulos Supervisor/Repositor permanecen disponibles para los roles
-- existentes; esta migración no los renombra ni elimina.

DO $$
BEGIN
  CREATE TYPE "AlcanceTarea" AS ENUM ('TODOS', 'SELECCIONADOS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tareas_globales"
  ADD COLUMN IF NOT EXISTS "alcance" "AlcanceTarea" NOT NULL DEFAULT 'TODOS';

CREATE TABLE IF NOT EXISTS "tareas_globales_usuario" (
  "id" SERIAL PRIMARY KEY,
  "tarea_global_id" INTEGER NOT NULL,
  "usuario_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tareas_globales_usuario_tarea_global_id_fkey"
    FOREIGN KEY ("tarea_global_id") REFERENCES "tareas_globales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tareas_globales_usuario_usuario_id_fkey"
    FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "tareas_globales_usuario_tarea_global_id_usuario_id_key"
  ON "tareas_globales_usuario"("tarea_global_id", "usuario_id");
CREATE INDEX IF NOT EXISTS "tareas_globales_usuario_usuario_id_tarea_global_id_idx"
  ON "tareas_globales_usuario"("usuario_id", "tarea_global_id");

ALTER TABLE "visitas"
  ADD COLUMN IF NOT EXISTS "entrada_clave_movil" VARCHAR(80),
  ADD COLUMN IF NOT EXISTS "salida_clave_movil" VARCHAR(80);
CREATE UNIQUE INDEX IF NOT EXISTS "visitas_entrada_clave_movil_key"
  ON "visitas"("entrada_clave_movil");
CREATE UNIQUE INDEX IF NOT EXISTS "visitas_salida_clave_movil_key"
  ON "visitas"("salida_clave_movil");

INSERT INTO "roles" ("descripcion")
VALUES ('teamleader.impulsador'), ('impulsador')
ON CONFLICT ("descripcion") DO NOTHING;

UPDATE "roles" AS operativo
SET "roles_id" = gestor."id"
FROM "roles" AS gestor
WHERE operativo."descripcion" = 'impulsador'
  AND gestor."descripcion" = 'teamleader.impulsador'
  AND operativo."id" <> gestor."id";

INSERT INTO "modulos" (
  "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at"
)
VALUES
  ('Impulsadores', 'teamleader-impulsador', 'equipo', 2, true, now(), now()),
  ('Mi jornada', 'impulsador', 'visitas', 3, true, now(), now())
ON CONFLICT ("ruta") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden",
  "activo" = true,
  "updated_at" = now();

INSERT INTO "paginas" (
  "modulo_id", "nombre", "ruta", "icono", "orden", "activo",
  "created_at", "updated_at"
)
SELECT m."id", p."nombre", p."ruta", p."icono", p."orden", true, now(), now()
FROM "modulos" AS m
CROSS JOIN (VALUES
  ('Equipo', 'equipo', 'equipo', 1),
  ('Mapa', 'mapa', 'mapa', 2),
  ('Locales', 'clientes', 'clientes', 3),
  ('Tareas', 'tareas', 'tareas', 4),
  ('Rendimiento', 'rendimiento', 'reportes', 5)
) AS p("nombre", "ruta", "icono", "orden")
WHERE m."ruta" = 'teamleader-impulsador'
ON CONFLICT ("modulo_id", "ruta") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden",
  "activo" = true,
  "updated_at" = now();

INSERT INTO "paginas" (
  "modulo_id", "nombre", "ruta", "icono", "orden", "activo",
  "created_at", "updated_at"
)
SELECT m."id", p."nombre", p."ruta", p."icono", p."orden", true, now(), now()
FROM "modulos" AS m
CROSS JOIN (VALUES
  ('Entrada', 'entrada', 'visitas', 1),
  ('Mis locales', 'locales', 'clientes', 2),
  ('Mis tareas', 'tareas', 'tareas', 3),
  ('Mis marcaciones', 'marcaciones', 'visitas', 4),
  ('Rendimiento', 'rendimiento', 'reportes', 5)
) AS p("nombre", "ruta", "icono", "orden")
WHERE m."ruta" = 'impulsador'
ON CONFLICT ("modulo_id", "ruta") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden",
  "activo" = true,
  "updated_at" = now();

-- Habilita los módulos nuevos en las empresas que ya usan la operación de
-- campo y en las empresas de los dos usuarios solicitados.
INSERT INTO "empresa_modulos" (
  "empresa_id", "modulo_id", "todas_las_paginas", "rol_ids", "created_at"
)
SELECT empresas."empresa_id", modulo."id", true, ARRAY[rol."id"], now()
FROM (
  SELECT DISTINCT em."empresa_id"
  FROM "empresa_modulos" em
  JOIN "modulos" legado ON legado."id" = em."modulo_id"
  WHERE legado."ruta" = 'supervisor'
  UNION
  SELECT DISTINCT u."empresa_id"
  FROM "usuarios" u
  WHERE lower(u."correo") = 'team.leader@fguarani.com.py'
) AS empresas
CROSS JOIN "modulos" modulo
CROSS JOIN "roles" rol
WHERE modulo."ruta" = 'teamleader-impulsador'
  AND rol."descripcion" = 'teamleader.impulsador'
ON CONFLICT ("empresa_id", "modulo_id") DO UPDATE SET
  "todas_las_paginas" = true,
  "rol_ids" = EXCLUDED."rol_ids";

INSERT INTO "empresa_modulos" (
  "empresa_id", "modulo_id", "todas_las_paginas", "rol_ids", "created_at"
)
SELECT empresas."empresa_id", modulo."id", true, ARRAY[rol."id"], now()
FROM (
  SELECT DISTINCT em."empresa_id"
  FROM "empresa_modulos" em
  JOIN "modulos" legado ON legado."id" = em."modulo_id"
  WHERE legado."ruta" = 'repositor'
  UNION
  SELECT DISTINCT u."empresa_id"
  FROM "usuarios" u
  WHERE lower(u."correo") = 'carlos@fguarani.com.py'
) AS empresas
CROSS JOIN "modulos" modulo
CROSS JOIN "roles" rol
WHERE modulo."ruta" = 'impulsador'
  AND rol."descripcion" = 'impulsador'
ON CONFLICT ("empresa_id", "modulo_id") DO UPDATE SET
  "todas_las_paginas" = true,
  "rol_ids" = EXCLUDED."rol_ids";

UPDATE "usuarios" AS u
SET "rol_id" = r."id", "updated_at" = now()
FROM "roles" AS r
WHERE lower(u."correo") = 'team.leader@fguarani.com.py'
  AND r."descripcion" = 'teamleader.impulsador';

UPDATE "usuarios" AS u
SET
  "rol_id" = r."id",
  "superior_id" = leader."id",
  "updated_at" = now()
FROM "roles" AS r, "usuarios" AS leader
WHERE lower(u."correo") = 'carlos@fguarani.com.py'
  AND r."descripcion" = 'impulsador'
  AND lower(leader."correo") = 'team.leader@fguarani.com.py'
  AND leader."empresa_id" = u."empresa_id";
