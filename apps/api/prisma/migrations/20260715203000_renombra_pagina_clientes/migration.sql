-- La sección administra primero clientes y, dentro de ella, sus locales.
-- Conserva la ruta técnica para no invalidar permisos ya asignados.
UPDATE "paginas" p
SET "nombre" = 'Clientes',
    "icono" = 'clientes',
    "updated_at" = now()
FROM "modulos" m
WHERE p."modulo_id" = m."id"
  AND m."ruta" = 'impulsador'
  AND p."ruta" = 'locales';
