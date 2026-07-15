-- Retira las páginas de demostración que no tienen una vista funcional.
-- Las asignaciones y ejecutables relacionados se eliminan por cascada.
DELETE FROM "paginas" AS p
USING "modulos" AS m
WHERE p."modulo_id" = m."id"
  AND (
    (m."ruta" = 'ventas' AND p."ruta" IN ('pedidos', 'facturacion'))
    OR (m."ruta" = 'clientes' AND p."ruta" = 'listado')
    OR (m."ruta" = 'reportes' AND p."ruta" = 'ventas-vendedor')
  );

-- Orden e iconos propios de las páginas activas del módulo Impulsador.
UPDATE "paginas" AS p
SET
  "orden" = CASE p."ruta"
    WHEN 'mapa' THEN 1
    WHEN 'locales' THEN 2
    WHEN 'visitas' THEN 3
  END,
  "icono" = CASE p."ruta"
    WHEN 'mapa' THEN 'mapa'
    WHEN 'locales' THEN 'locales'
    WHEN 'visitas' THEN 'visitas'
  END,
  "updated_at" = now()
FROM "modulos" AS m
WHERE p."modulo_id" = m."id"
  AND m."ruta" = 'impulsador'
  AND p."ruta" IN ('mapa', 'locales', 'visitas');
