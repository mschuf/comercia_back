BEGIN;

-- Conserva el catálogo global en cada empresa, incluidos los roles sin usuarios.
-- La primera empresa conserva los IDs originales; las demás reciben copias.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM roles) AND NOT EXISTS (SELECT 1 FROM empresas) THEN
    RAISE EXCEPTION 'No se pueden asignar los roles existentes sin una empresa';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT unnest(rol_ids) AS id FROM empresa_modulos
      UNION ALL SELECT unnest(rol_ids) FROM empresa_paginas
    ) permisos LEFT JOIN roles r ON r.id = permisos.id WHERE r.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Hay permisos con roles inexistentes; corregirlos antes de migrar';
  END IF;
END $$;

ALTER TABLE roles ADD COLUMN empresa_id INTEGER;
DROP INDEX roles_descripcion_key;
CREATE TEMP TABLE roles_originales ON COMMIT DROP AS SELECT id, descripcion, roles_id FROM roles;
CREATE TEMP TABLE roles_empresa_mapa (
  original_id INTEGER NOT NULL,
  empresa_id INTEGER NOT NULL,
  nuevo_id INTEGER NOT NULL,
  PRIMARY KEY (original_id, empresa_id)
) ON COMMIT DROP;

-- Sin asumir que la secuencia está sincronizada con importaciones previas.
SELECT setval(pg_get_serial_sequence('roles', 'id'), GREATEST(COALESCE(MAX(id), 0), 1), COUNT(*) > 0) FROM roles;
INSERT INTO roles_empresa_mapa
SELECT r.id, e.id,
  CASE WHEN e.id = (SELECT MIN(id) FROM empresas) THEN r.id
       ELSE nextval(pg_get_serial_sequence('roles', 'id'))::INTEGER END
FROM roles_originales r CROSS JOIN empresas e ORDER BY e.id, r.id;

UPDATE roles SET empresa_id = (SELECT MIN(id) FROM empresas);
INSERT INTO roles (id, descripcion, empresa_id)
SELECT m.nuevo_id, r.descripcion, m.empresa_id
FROM roles_empresa_mapa m JOIN roles_originales r ON r.id = m.original_id
WHERE m.nuevo_id <> m.original_id;

UPDATE roles r SET roles_id = padre.nuevo_id
FROM roles_empresa_mapa m
JOIN roles_originales original ON original.id = m.original_id
JOIN roles_empresa_mapa padre ON padre.original_id = original.roles_id AND padre.empresa_id = m.empresa_id
WHERE r.id = m.nuevo_id;

UPDATE usuarios u SET rol_id = m.nuevo_id
FROM roles_empresa_mapa m WHERE m.original_id = u.rol_id AND m.empresa_id = u.empresa_id;
UPDATE empresa_modulos em SET rol_ids = ARRAY(
  SELECT m.nuevo_id FROM unnest(em.rol_ids) WITH ORDINALITY AS permisos(id, posicion)
  JOIN roles_empresa_mapa m ON m.original_id = permisos.id AND m.empresa_id = em.empresa_id
  ORDER BY permisos.posicion
);
UPDATE empresa_paginas ep SET rol_ids = ARRAY(
  SELECT m.nuevo_id FROM unnest(ep.rol_ids) WITH ORDINALITY AS permisos(id, posicion)
  JOIN roles_empresa_mapa m ON m.original_id = permisos.id AND m.empresa_id = ep.empresa_id
  ORDER BY permisos.posicion
);

ALTER TABLE roles ALTER COLUMN empresa_id SET NOT NULL;
CREATE UNIQUE INDEX roles_empresa_id_descripcion_key ON roles(empresa_id, descripcion);
CREATE UNIQUE INDEX roles_id_empresa_id_key ON roles(id, empresa_id);
ALTER TABLE roles ADD CONSTRAINT roles_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE roles DROP CONSTRAINT roles_roles_id_fkey;
ALTER TABLE roles ADD CONSTRAINT roles_roles_id_empresa_id_fkey FOREIGN KEY (roles_id, empresa_id) REFERENCES roles(id, empresa_id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE usuarios DROP CONSTRAINT usuarios_rol_id_fkey;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_id_empresa_id_fkey FOREIGN KEY (rol_id, empresa_id) REFERENCES roles(id, empresa_id) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT;
