-- Orden canónico del menú Team Leader. "Inicio" no se persiste como página:
-- el frontend lo agrega siempre antes de las páginas habilitadas del módulo.
UPDATE "modulos"
SET
  "nombre" = 'Team Leader',
  "icono" = 'equipo',
  "orden" = 1,
  "activo" = true,
  "updated_at" = now()
WHERE "ruta" = 'team-leader';

-- Crea o normaliza las cuatro páginas de Team Leader sin alterar el módulo
-- Repositor ni las asignaciones de módulos/roles de ninguna empresa.
INSERT INTO "paginas" (
  "modulo_id", "nombre", "ruta", "icono", "orden", "activo",
  "created_at", "updated_at"
)
SELECT
  m."id",
  pagina."nombre",
  pagina."ruta",
  pagina."icono",
  pagina."orden",
  true,
  now(),
  now()
FROM "modulos" AS m
CROSS JOIN (VALUES
  ('Equipo', 'equipo', 'equipo', 1),
  ('Mapa', 'mapa', 'mapa', 2),
  ('Tareas', 'tareas', 'tareas', 3),
  ('Clientes', 'clientes', 'clientes', 4)
) AS pagina("nombre", "ruta", "icono", "orden")
WHERE m."ruta" = 'team-leader'
ON CONFLICT ("modulo_id", "ruta") DO UPDATE
SET
  "nombre" = EXCLUDED."nombre",
  "icono" = EXCLUDED."icono",
  "orden" = EXCLUDED."orden",
  "activo" = true,
  "updated_at" = now();

-- "Equipo" sustituye a la antigua entrada "Visitas" del Team Leader.
-- En empresas con selección parcial de páginas, conserva esa misma
-- habilitación y sus rol_ids. Las empresas con todas_las_paginas=true reciben
-- Equipo automáticamente por la regla normal del módulo.
INSERT INTO "empresa_paginas" (
  "empresa_id", "pagina_id", "rol_ids", "created_at"
)
SELECT
  ep."empresa_id",
  equipo."id",
  ep."rol_ids",
  ep."created_at"
FROM "empresa_paginas" AS ep
JOIN "paginas" AS visitas
  ON visitas."id" = ep."pagina_id"
JOIN "modulos" AS m
  ON m."id" = visitas."modulo_id" AND m."ruta" = 'team-leader'
JOIN "paginas" AS equipo
  ON equipo."modulo_id" = m."id" AND equipo."ruta" = 'equipo'
WHERE visitas."ruta" = 'visitas'
ON CONFLICT ("empresa_id", "pagina_id") DO NOTHING;

-- Toda empresa que ya tiene Team Leader con selección parcial incorpora la
-- nueva página. Se copian los rol_ids del módulo, de modo que Equipo nunca
-- queda visible para un rol que no pudiera entrar al módulo; si la asignación
-- heredada de Visitas era más restrictiva, el ON CONFLICT anterior la conserva.
INSERT INTO "empresa_paginas" (
  "empresa_id", "pagina_id", "rol_ids", "created_at"
)
SELECT
  em."empresa_id",
  equipo."id",
  em."rol_ids",
  now()
FROM "empresa_modulos" AS em
JOIN "modulos" AS m
  ON m."id" = em."modulo_id" AND m."ruta" = 'team-leader'
JOIN "paginas" AS equipo
  ON equipo."modulo_id" = m."id" AND equipo."ruta" = 'equipo'
WHERE em."todas_las_paginas" = false
ON CONFLICT ("empresa_id", "pagina_id") DO NOTHING;

-- Elimina únicamente páginas no canónicas de Team Leader. Las asignaciones y
-- ejecutables dependientes se limpian mediante sus FK ON DELETE CASCADE.
DELETE FROM "paginas" AS p
USING "modulos" AS m
WHERE p."modulo_id" = m."id"
  AND m."ruta" = 'team-leader'
  AND p."ruta" NOT IN ('equipo', 'mapa', 'tareas', 'clientes');
