-- Separa la experiencia de gestión de la experiencia operativa. Ambas usan
-- los mismos datos de campo, pero tienen navegación y autorización propias.

-- El nombre visible del rol acompaña al nuevo módulo. El ID se conserva para
-- no invalidar usuarios, jerarquías ni configuraciones existentes.
UPDATE "roles"
SET "descripcion" = 'TEAM LEADER'
WHERE "descripcion" = 'TEAMLEADER';

INSERT INTO "roles" ("descripcion")
VALUES ('REPOSITOR')
ON CONFLICT ("descripcion") DO NOTHING;

-- El rol legado IMPULSADOR pasa a ser REPOSITOR antes de eliminarse. También
-- se reemplazan sus referencias guardadas en arrays, que no tienen FK.
UPDATE "usuarios" AS u
SET "rol_id" = repositor."id"
FROM "roles" AS legado, "roles" AS repositor
WHERE legado."descripcion" = 'IMPULSADOR'
  AND repositor."descripcion" = 'REPOSITOR'
  AND u."rol_id" = legado."id";

UPDATE "config_impulsador" AS c
SET
  "rol_gestor_ids" = array_remove(c."rol_gestor_ids", legado."id"),
  "rol_operativo_ids" = ARRAY(
    SELECT DISTINCT CASE WHEN rol_id = legado."id" THEN repositor."id" ELSE rol_id END
    FROM unnest(c."rol_operativo_ids") AS rol_id
    ORDER BY 1
  ),
  "rol_admin_usuario_ids" = ARRAY(
    SELECT DISTINCT CASE WHEN rol_id = legado."id" THEN repositor."id" ELSE rol_id END
    FROM unnest(c."rol_admin_usuario_ids") AS rol_id
    ORDER BY 1
  ),
  "updated_at" = now()
FROM "roles" AS legado, "roles" AS repositor
WHERE legado."descripcion" = 'IMPULSADOR'
  AND repositor."descripcion" = 'REPOSITOR';

UPDATE "empresa_modulos" AS em
SET "rol_ids" = ARRAY(
  SELECT DISTINCT CASE WHEN rol_id = legado."id" THEN repositor."id" ELSE rol_id END
  FROM unnest(em."rol_ids") AS rol_id
  ORDER BY 1
)
FROM "roles" AS legado, "roles" AS repositor
WHERE legado."descripcion" = 'IMPULSADOR'
  AND repositor."descripcion" = 'REPOSITOR'
  AND legado."id" = ANY(em."rol_ids");

UPDATE "empresa_paginas" AS ep
SET "rol_ids" = ARRAY(
  SELECT DISTINCT CASE WHEN rol_id = legado."id" THEN repositor."id" ELSE rol_id END
  FROM unnest(ep."rol_ids") AS rol_id
  ORDER BY 1
)
FROM "roles" AS legado, "roles" AS repositor
WHERE legado."descripcion" = 'IMPULSADOR'
  AND repositor."descripcion" = 'REPOSITOR'
  AND legado."id" = ANY(ep."rol_ids");

DELETE FROM "roles"
WHERE "descripcion" = 'IMPULSADOR';

-- Retira definitivamente los módulos de demostración que quedaron vacíos.
-- Sus asignaciones por empresa se eliminan por cascada.
DELETE FROM "modulos"
WHERE "ruta" IN ('ventas', 'clientes', 'reportes');

-- El módulo anterior conserva su ID y sus asignaciones, pero adopta la nueva
-- identidad de Team Leader.
UPDATE "modulos"
SET
  "nombre" = 'Team Leader',
  "ruta" = 'team-leader',
  "icono" = 'mapa',
  "orden" = 1,
  "activo" = true,
  "updated_at" = now()
WHERE "ruta" = 'impulsador';

INSERT INTO "modulos" (
  "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at"
)
VALUES ('Team Leader', 'team-leader', 'mapa', 1, true, now(), now())
ON CONFLICT ("ruta") DO UPDATE
SET
  "nombre" = EXCLUDED."nombre",
  "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden",
  "activo" = true,
  "updated_at" = now();

-- La ruta ahora expresa la entidad que ve el usuario; /locales era un resto
-- técnico de la primera versión.
UPDATE "paginas" AS p
SET "ruta" = 'clientes', "updated_at" = now()
FROM "modulos" AS m
WHERE p."modulo_id" = m."id"
  AND m."ruta" = 'team-leader'
  AND p."ruta" = 'locales';

DELETE FROM "paginas" AS p
USING "modulos" AS m
WHERE p."modulo_id" = m."id"
  AND m."ruta" = 'team-leader'
  AND p."ruta" NOT IN ('mapa', 'clientes', 'tareas', 'visitas');

INSERT INTO "paginas" (
  "modulo_id", "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at"
)
SELECT m."id", pagina."nombre", pagina."ruta", pagina."icono", pagina."orden", true, now(), now()
FROM "modulos" AS m
CROSS JOIN (VALUES
  ('Mapa', 'mapa', 'mapa', 1),
  ('Clientes', 'clientes', 'clientes', 2),
  ('Tareas', 'tareas', 'tareas', 3),
  ('Visitas', 'visitas', 'visitas', 4)
) AS pagina("nombre", "ruta", "icono", "orden")
WHERE m."ruta" = 'team-leader'
ON CONFLICT ("modulo_id", "ruta") DO UPDATE
SET
  "nombre" = EXCLUDED."nombre",
  "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden",
  "activo" = true,
  "updated_at" = now();

-- Repositor reutiliza Clientes, Tareas y Visitas. Mapa queda reservado a la
-- gestión del Team Leader.
INSERT INTO "modulos" (
  "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at"
)
VALUES ('Repositor', 'repositor', 'visitas', 2, true, now(), now())
ON CONFLICT ("ruta") DO UPDATE
SET
  "nombre" = EXCLUDED."nombre",
  "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden",
  "activo" = true,
  "updated_at" = now();

DELETE FROM "paginas" AS p
USING "modulos" AS m
WHERE p."modulo_id" = m."id"
  AND m."ruta" = 'repositor'
  AND p."ruta" NOT IN ('clientes', 'tareas', 'visitas');

INSERT INTO "paginas" (
  "modulo_id", "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at"
)
SELECT m."id", pagina."nombre", pagina."ruta", pagina."icono", pagina."orden", true, now(), now()
FROM "modulos" AS m
CROSS JOIN (VALUES
  ('Mis clientes', 'clientes', 'clientes', 1),
  ('Mis tareas', 'tareas', 'tareas', 2),
  ('Mis visitas', 'visitas', 'visitas', 3)
) AS pagina("nombre", "ruta", "icono", "orden")
WHERE m."ruta" = 'repositor'
ON CONFLICT ("modulo_id", "ruta") DO UPDATE
SET
  "nombre" = EXCLUDED."nombre",
  "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden",
  "activo" = true,
  "updated_at" = now();

-- Alinea la visibilidad del módulo Team Leader con la configuración funcional
-- de cada empresa. Sin configuración explícita, solo TEAM LEADER lo ve.
UPDATE "empresa_modulos" AS em
SET
  "todas_las_paginas" = true,
  "rol_ids" = CASE
    WHEN cardinality(COALESCE((
      SELECT c."rol_gestor_ids"
      FROM "config_impulsador" AS c
      WHERE c."empresa_id" = em."empresa_id"
    ), ARRAY[]::INTEGER[])) > 0
    THEN (
      SELECT c."rol_gestor_ids"
      FROM "config_impulsador" AS c
      WHERE c."empresa_id" = em."empresa_id"
    )
    ELSE ARRAY(
      SELECT r."id" FROM "roles" AS r WHERE r."descripcion" = 'TEAM LEADER'
    )
  END
FROM "modulos" AS m
WHERE em."modulo_id" = m."id"
  AND m."ruta" = 'team-leader';

-- Toda empresa que tenía el módulo anterior recibe la contraparte Repositor.
-- Su rol por defecto es REPOSITOR, salvo configuración operativa explícita.
INSERT INTO "empresa_modulos" (
  "empresa_id", "modulo_id", "todas_las_paginas", "rol_ids", "created_at"
)
SELECT
  em."empresa_id",
  repositor."id",
  true,
  CASE
    WHEN cardinality(COALESCE((
      SELECT c."rol_operativo_ids"
      FROM "config_impulsador" AS c
      WHERE c."empresa_id" = em."empresa_id"
    ), ARRAY[]::INTEGER[])) > 0
      THEN (
        SELECT c."rol_operativo_ids"
        FROM "config_impulsador" AS c
        WHERE c."empresa_id" = em."empresa_id"
      )
    ELSE ARRAY(
      SELECT r."id" FROM "roles" AS r WHERE r."descripcion" = 'REPOSITOR'
    )
  END,
  now()
FROM "empresa_modulos" AS em
JOIN "modulos" AS team_leader
  ON team_leader."id" = em."modulo_id" AND team_leader."ruta" = 'team-leader'
CROSS JOIN "modulos" AS repositor
WHERE repositor."ruta" = 'repositor'
ON CONFLICT ("empresa_id", "modulo_id") DO UPDATE
SET
  "todas_las_paginas" = true,
  "rol_ids" = EXCLUDED."rol_ids";

-- Ambos módulos quedan canónicos y completos; ya no necesitan asignaciones de
-- páginas parciales heredadas del módulo anterior.
DELETE FROM "empresa_paginas" AS ep
USING "paginas" AS p, "modulos" AS m
WHERE ep."pagina_id" = p."id"
  AND p."modulo_id" = m."id"
  AND m."ruta" IN ('team-leader', 'repositor');
