-- Las pantallas y permisos del antiguo Team Leader pasan al rol Supervisor.
-- Se conserva el ID de cada usuario para no alterar sus subordinados, locales,
-- territorios, visitas ni auditoría.

INSERT INTO "roles" ("descripcion")
VALUES ('SUPERVISOR')
ON CONFLICT ("descripcion") DO NOTHING;

UPDATE "usuarios" AS u
SET "rol_id" = supervisor."id"
FROM "roles" AS supervisor
WHERE supervisor."descripcion" = 'SUPERVISOR'
  AND u."rol_id" IN (
    SELECT legado."id"
    FROM "roles" AS legado
    WHERE legado."descripcion" IN ('TEAM LEADER', 'TEAMLEADER')
  );

-- Migra también la jerarquía declarativa entre roles, evitando un auto-enlace
-- si Supervisor dependía previamente de uno de los roles legados.
UPDATE "roles" AS rol
SET "roles_id" = CASE
  WHEN rol."id" = supervisor."id" THEN NULL
  ELSE supervisor."id"
END
FROM "roles" AS supervisor
WHERE supervisor."descripcion" = 'SUPERVISOR'
  AND rol."roles_id" IN (
    SELECT legado."id"
    FROM "roles" AS legado
    WHERE legado."descripcion" IN ('TEAM LEADER', 'TEAMLEADER')
  );

-- rol_ids son arrays sin FK: reemplaza allí también el rol legado y elimina
-- duplicados si Supervisor ya estaba configurado explícitamente.
UPDATE "empresa_modulos" AS em
SET "rol_ids" = ARRAY(
  SELECT DISTINCT
    CASE
      WHEN rol_id IN (
        SELECT legado."id"
        FROM "roles" AS legado
        WHERE legado."descripcion" IN ('TEAM LEADER', 'TEAMLEADER')
      ) THEN supervisor."id"
      ELSE rol_id
    END
  FROM unnest(em."rol_ids") AS rol_id
  ORDER BY 1
)
FROM "roles" AS supervisor
WHERE supervisor."descripcion" = 'SUPERVISOR'
  AND EXISTS (
    SELECT 1
    FROM unnest(em."rol_ids") AS rol_id
    JOIN "roles" AS legado ON legado."id" = rol_id
    WHERE legado."descripcion" IN ('TEAM LEADER', 'TEAMLEADER')
  );

UPDATE "empresa_paginas" AS ep
SET "rol_ids" = ARRAY(
  SELECT DISTINCT
    CASE
      WHEN rol_id IN (
        SELECT legado."id"
        FROM "roles" AS legado
        WHERE legado."descripcion" IN ('TEAM LEADER', 'TEAMLEADER')
      ) THEN supervisor."id"
      ELSE rol_id
    END
  FROM unnest(ep."rol_ids") AS rol_id
  ORDER BY 1
)
FROM "roles" AS supervisor
WHERE supervisor."descripcion" = 'SUPERVISOR'
  AND EXISTS (
    SELECT 1
    FROM unnest(ep."rol_ids") AS rol_id
    JOIN "roles" AS legado ON legado."id" = rol_id
    WHERE legado."descripcion" IN ('TEAM LEADER', 'TEAMLEADER')
  );

DELETE FROM "roles"
WHERE "descripcion" IN ('TEAM LEADER', 'TEAMLEADER');

-- Conserva el ID del módulo y de sus páginas para mantener todas las
-- asignaciones de empresa, página y ejecutables existentes.
UPDATE "modulos"
SET
  "nombre" = 'Supervisor',
  "ruta" = 'supervisor',
  "icono" = 'equipo',
  "orden" = 1,
  "activo" = true,
  "updated_at" = now()
WHERE "ruta" = 'team-leader';
