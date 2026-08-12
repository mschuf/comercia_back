-- Jerarquía operativa de impulsadores, tareas por local y navegación sin mapas.

INSERT INTO "roles" ("descripcion")
VALUES ('supervisor.impulsador'), ('teamleader.impulsador'), ('impulsador')
ON CONFLICT ("descripcion") DO NOTHING;

UPDATE "roles" AS teamleader
SET "roles_id" = supervisor."id"
FROM "roles" AS supervisor
WHERE teamleader."descripcion" = 'teamleader.impulsador'
  AND supervisor."descripcion" = 'supervisor.impulsador'
  AND teamleader."id" <> supervisor."id";

UPDATE "roles" AS impulsador
SET "roles_id" = teamleader."id"
FROM "roles" AS teamleader
WHERE impulsador."descripcion" = 'impulsador'
  AND teamleader."descripcion" = 'teamleader.impulsador'
  AND impulsador."id" <> teamleader."id";

ALTER TABLE "tareas_globales"
  ADD COLUMN IF NOT EXISTS "alcance_locales" "AlcanceTarea" NOT NULL DEFAULT 'TODOS';

CREATE TABLE IF NOT EXISTS "tareas_globales_local" (
  "id" SERIAL PRIMARY KEY,
  "tarea_global_id" INTEGER NOT NULL,
  "local_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tareas_globales_local_tarea_global_id_fkey"
    FOREIGN KEY ("tarea_global_id") REFERENCES "tareas_globales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "tareas_globales_local_local_id_fkey"
    FOREIGN KEY ("local_id") REFERENCES "locales"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "tareas_globales_local_tarea_global_id_local_id_key"
  ON "tareas_globales_local"("tarea_global_id", "local_id");
CREATE INDEX IF NOT EXISTS "tareas_globales_local_local_id_tarea_global_id_idx"
  ON "tareas_globales_local"("local_id", "tarea_global_id");

INSERT INTO "modulos" (
  "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at"
)
VALUES ('Supervisión de impulsadores', 'supervisor-impulsador', 'equipo', 2, true, now(), now())
ON CONFLICT ("ruta") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden",
  "activo" = true,
  "updated_at" = now();

INSERT INTO "paginas" (
  "modulo_id", "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at"
)
SELECT m."id", p."nombre", p."ruta", p."icono", p."orden", true, now(), now()
FROM "modulos" AS m
CROSS JOIN (VALUES
  ('Equipo', 'equipo', 'equipo', 1),
  ('Asignación de locales', 'locales', 'clientes', 2),
  ('Tareas', 'tareas', 'tareas', 3),
  ('Presentismo', 'presentismo', 'reportes', 4)
) AS p("nombre", "ruta", "icono", "orden")
WHERE m."ruta" = 'supervisor-impulsador'
ON CONFLICT ("modulo_id", "ruta") DO UPDATE SET
  "nombre" = EXCLUDED."nombre", "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden", "activo" = true, "updated_at" = now();

-- Team leaders: equipo, asignación, tareas y presentismo. Sin mapas/KPI de tareas.
UPDATE "paginas" p
SET "activo" = false, "updated_at" = now()
FROM "modulos" m
WHERE p."modulo_id" = m."id"
  AND m."ruta" = 'teamleader-impulsador';

INSERT INTO "paginas" (
  "modulo_id", "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at"
)
SELECT m."id", p."nombre", p."ruta", p."icono", p."orden", true, now(), now()
FROM "modulos" AS m
CROSS JOIN (VALUES
  ('Mi equipo', 'equipo', 'equipo', 1),
  ('Asignación de locales', 'locales', 'clientes', 2),
  ('Tareas', 'tareas', 'tareas', 3),
  ('Presentismo', 'presentismo', 'reportes', 4)
) AS p("nombre", "ruta", "icono", "orden")
WHERE m."ruta" = 'teamleader-impulsador'
ON CONFLICT ("modulo_id", "ruta") DO UPDATE SET
  "nombre" = EXCLUDED."nombre", "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden", "activo" = true, "updated_at" = now();

-- Impulsador y team leader comparten la jornada móvil: solo entrada/salida e historial.
UPDATE "paginas" p
SET "activo" = false, "updated_at" = now()
FROM "modulos" m
WHERE p."modulo_id" = m."id" AND m."ruta" = 'impulsador';

INSERT INTO "paginas" (
  "modulo_id", "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at"
)
SELECT m."id", p."nombre", p."ruta", p."icono", p."orden", true, now(), now()
FROM "modulos" AS m
CROSS JOIN (VALUES
  ('Jornada', 'entrada', 'visitas', 1),
  ('Mis marcaciones', 'marcaciones', 'visitas', 2)
) AS p("nombre", "ruta", "icono", "orden")
WHERE m."ruta" = 'impulsador'
ON CONFLICT ("modulo_id", "ruta") DO UPDATE SET
  "nombre" = EXCLUDED."nombre", "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden", "activo" = true, "updated_at" = now();

INSERT INTO "empresa_modulos" (
  "empresa_id", "modulo_id", "todas_las_paginas", "rol_ids", "created_at"
)
SELECT empresas."empresa_id", modulo."id", true, ARRAY[rol."id"], now()
FROM (
  SELECT DISTINCT em."empresa_id"
  FROM "empresa_modulos" em
  JOIN "modulos" m ON m."id" = em."modulo_id"
  WHERE m."ruta" IN ('supervisor', 'teamleader-impulsador')
  UNION
  SELECT DISTINCT u."empresa_id" FROM "usuarios" u
  WHERE lower(u."correo") = 'team.leader@fguarani.com.py'
) empresas
CROSS JOIN "modulos" modulo
CROSS JOIN "roles" rol
WHERE modulo."ruta" = 'supervisor-impulsador'
  AND rol."descripcion" = 'supervisor.impulsador'
ON CONFLICT ("empresa_id", "modulo_id") DO UPDATE SET
  "todas_las_paginas" = true, "rol_ids" = EXCLUDED."rol_ids";

UPDATE "empresa_modulos" em
SET "rol_ids" = ARRAY(
  SELECT DISTINCT id FROM unnest(em."rol_ids" || ARRAY[
    (SELECT "id" FROM "roles" WHERE "descripcion" = 'impulsador'),
    (SELECT "id" FROM "roles" WHERE "descripcion" = 'teamleader.impulsador')
  ]) AS id WHERE id IS NOT NULL
), "todas_las_paginas" = true
FROM "modulos" m
WHERE em."modulo_id" = m."id" AND m."ruta" = 'impulsador';

-- Usuario de prueba: comparte temporalmente la contraseña del team leader.
INSERT INTO "usuarios" (
  "empresa_id", "nombre", "apellido", "correo", "nombre_login",
  "password_hash", "ruc", "celular", "rol_id", "superior_id",
  "es_superadmin", "is_active", "created_at", "updated_at"
)
SELECT leader."empresa_id", 'Supervisor', 'Impulsador',
  'supervisor.impulsador@fguarani.com.py', 'supervisor.impulsador',
  leader."password_hash", 'SUP-IMP-TEST', '+595000000015', rol."id", NULL,
  false, true, now(), now()
FROM "usuarios" leader
CROSS JOIN "roles" rol
WHERE lower(leader."correo") = 'team.leader@fguarani.com.py'
  AND rol."descripcion" = 'supervisor.impulsador'
ON CONFLICT ("correo") DO UPDATE SET
  "rol_id" = EXCLUDED."rol_id", "empresa_id" = EXCLUDED."empresa_id",
  "is_active" = true, "updated_at" = now();

UPDATE "usuarios" AS leader
SET "superior_id" = supervisor."id", "updated_at" = now()
FROM "usuarios" AS supervisor
WHERE lower(leader."correo") = 'team.leader@fguarani.com.py'
  AND lower(supervisor."correo") = 'supervisor.impulsador@fguarani.com.py'
  AND leader."empresa_id" = supervisor."empresa_id";
