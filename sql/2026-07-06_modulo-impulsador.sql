-- ============================================================================
-- comercIA — Módulo Impulsador: usuario teamleader, rol de carlos.morteira,
-- módulo "impulsador" con página "locales" asignado a FRIGORIFICO GUARANI
-- visible solo para los roles TEAMLEADER e IMPULSADOR.
--
-- Idempotente: se puede ejecutar más de una vez sin duplicar datos.
-- Los ids se resuelven por nombre (en producción pueden ser distintos).
--
-- REQUISITO: la migración de estructura "roles_visibilidad_y_locales"
-- (columnas rol_ids + tabla locales) ya aplicada — el deploy la corre solo.
--
-- Credenciales del teamleader que crea este script:
--   usuario:    team.leader   (correo team.leader@fguarani.com.py)
--   contraseña: ClaveLider9
-- ============================================================================

BEGIN;

-- 1) Usuario TEAMLEADER de FRIGORIFICO GUARANI
INSERT INTO usuarios (
  empresa_id, nombre, apellido, correo, nombre_login, password_hash,
  ruc, celular, rol_id, es_superadmin, is_active, created_at, updated_at
)
SELECT
  e.id, 'Team', 'Leader', 'team.leader@fguarani.com.py', 'team.leader',
  'scrypt$16384$8$1$VL6y4Zf6UahsrLQw1G2B6A==$fTV6MG6XiD0OhcoI6809KVKBsCAAxjFrzUotDks1zC0rqO1HUyI9NxdOa80NsjKq8dt2P2iy9iTEd3vj0IWDVg==',
  '5321478-1', '0981000001',
  (SELECT id FROM roles WHERE descripcion = 'TEAMLEADER'),
  false, true, now(), now()
FROM empresas e
WHERE e.nombre = 'FRIGORIFICO GUARANI'
  AND NOT EXISTS (SELECT 1 FROM usuarios WHERE nombre_login = 'team.leader');

-- 2) carlos.morteira pasa a rol IMPULSADOR, con team.leader como superior
UPDATE usuarios
SET rol_id      = (SELECT id FROM roles WHERE descripcion = 'IMPULSADOR'),
    superior_id = (SELECT id FROM usuarios WHERE nombre_login = 'team.leader'),
    updated_at  = now()
WHERE nombre_login = 'carlos.morteira';

-- 3) Módulo Impulsador + página Locales
INSERT INTO modulos (nombre, ruta, icono, orden, activo, created_at, updated_at)
SELECT 'Impulsador', 'impulsador', 'mapa', 4, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE ruta = 'impulsador');

INSERT INTO paginas (modulo_id, nombre, ruta, icono, orden, activo, created_at, updated_at)
SELECT m.id, 'Locales', 'locales', NULL, 1, true, now(), now()
FROM modulos m
WHERE m.ruta = 'impulsador'
  AND NOT EXISTS (
    SELECT 1 FROM paginas p WHERE p.modulo_id = m.id AND p.ruta = 'locales'
  );

-- 4) Habilitar el módulo para GUARANI, solo roles TEAMLEADER e IMPULSADOR
INSERT INTO empresa_modulos (empresa_id, modulo_id, todas_las_paginas, rol_ids, created_at)
SELECT
  e.id, m.id, true,
  ARRAY(SELECT id FROM roles WHERE descripcion IN ('TEAMLEADER', 'IMPULSADOR') ORDER BY id),
  now()
FROM empresas e, modulos m
WHERE e.nombre = 'FRIGORIFICO GUARANI' AND m.ruta = 'impulsador'
ON CONFLICT (empresa_id, modulo_id)
DO UPDATE SET todas_las_paginas = EXCLUDED.todas_las_paginas,
              rol_ids           = EXCLUDED.rol_ids;

COMMIT;
