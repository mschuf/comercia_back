-- Las empresas con asignación parcial del módulo no heredan páginas
-- nuevas. Habilita Tareas explícitamente; la API sigue decidiendo quién puede
-- mutar según los roles gestores configurados.
INSERT INTO "empresa_paginas" (
  "empresa_id", "pagina_id", "rol_ids", "created_at"
)
SELECT em."empresa_id", p."id", ARRAY[]::INTEGER[], now()
FROM "empresa_modulos" em
JOIN "modulos" m ON m."id" = em."modulo_id"
JOIN "paginas" p ON p."modulo_id" = m."id" AND p."ruta" = 'tareas'
WHERE m."ruta" = 'impulsador'
  AND em."todas_las_paginas" = false
ON CONFLICT ("empresa_id", "pagina_id") DO NOTHING;
