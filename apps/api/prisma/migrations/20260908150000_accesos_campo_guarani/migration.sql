-- Completa la configuración para el nombre registrado de la empresa.
-- Conserva cualquier asignación que ya haya configurado el administrador.
INSERT INTO empresa_modulos(empresa_id, modulo_id, todas_las_paginas, rol_ids)
SELECT e.id, m.id, true, array_agg(r.id ORDER BY r.id)
FROM empresas e
JOIN roles r ON r.empresa_id = e.id
CROSS JOIN modulos m
WHERE lower(trim(translate(e.nombre, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'))) = 'frigorifico guarani'
AND (
  (m.ruta = 'gestion-campo' AND regexp_replace(lower(r.descripcion), '[^a-z]', '', 'g') = 'teamleader')
  OR (m.ruta = 'mi-jornada' AND regexp_replace(lower(r.descripcion), '[^a-z]', '', 'g') = 'impulsador')
)
GROUP BY e.id, m.id
ON CONFLICT (empresa_id, modulo_id) DO NOTHING;
