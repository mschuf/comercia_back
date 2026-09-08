BEGIN;
CREATE TYPE "FrecuenciaCampo" AS ENUM ('DIARIA', 'SEMANAL', 'MENSUAL');
CREATE TABLE campo_clientes (
 id SERIAL PRIMARY KEY, empresa_id INT NOT NULL REFERENCES empresas(id), nombre VARCHAR(120) NOT NULL,
 ruc VARCHAR(30) NOT NULL DEFAULT '', contacto VARCHAR(120) NOT NULL DEFAULT '', telefono VARCHAR(40) NOT NULL DEFAULT '', activo BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE campo_locales (
 id SERIAL PRIMARY KEY, cliente_id INT NOT NULL REFERENCES campo_clientes(id), nombre VARCHAR(120) NOT NULL,
 direccion VARCHAR(250) NOT NULL DEFAULT '', contacto VARCHAR(120) NOT NULL DEFAULT '', telefono VARCHAR(40) NOT NULL DEFAULT '',
 latitud DOUBLE PRECISION NOT NULL CHECK (latitud BETWEEN -90 AND 90), longitud DOUBLE PRECISION NOT NULL CHECK (longitud BETWEEN -180 AND 180),
 notas VARCHAR(1000) NOT NULL DEFAULT '', activo BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE campo_horarios (
 id SERIAL PRIMARY KEY, local_id INT NOT NULL REFERENCES campo_locales(id), frecuencia "FrecuenciaCampo" NOT NULL DEFAULT 'SEMANAL',
 intervalo INT NOT NULL DEFAULT 1 CHECK (intervalo BETWEEN 1 AND 52), dias_semana INT[] NOT NULL DEFAULT '{}', dias_mes INT[] NOT NULL DEFAULT '{}',
 fecha_desde DATE NOT NULL, fecha_hasta DATE, entrada VARCHAR(5) NOT NULL, salida VARCHAR(5) NOT NULL, activo BOOLEAN NOT NULL DEFAULT true,
 CHECK (fecha_hasta IS NULL OR fecha_hasta >= fecha_desde), CHECK (entrada < salida)
);
CREATE TABLE campo_asignaciones (
 id SERIAL PRIMARY KEY, local_id INT NOT NULL REFERENCES campo_locales(id), usuario_id INT NOT NULL REFERENCES usuarios(id),
 fecha_desde DATE NOT NULL, fecha_hasta DATE, activo BOOLEAN NOT NULL DEFAULT true,
 CHECK (fecha_hasta IS NULL OR fecha_hasta >= fecha_desde)
);
CREATE TABLE campo_backups (
 id SERIAL PRIMARY KEY, asignacion_id INT NOT NULL REFERENCES campo_asignaciones(id), usuario_id INT NOT NULL REFERENCES usuarios(id),
 fecha_desde DATE NOT NULL, fecha_hasta DATE NOT NULL, motivo VARCHAR(250) NOT NULL, activo BOOLEAN NOT NULL DEFAULT true,
 CHECK (fecha_hasta >= fecha_desde)
);
CREATE TABLE campo_tareas (
 id SERIAL PRIMARY KEY, empresa_id INT NOT NULL REFERENCES empresas(id), nombre VARCHAR(120) NOT NULL,
 descripcion VARCHAR(1000) NOT NULL DEFAULT '', todos_locales BOOLEAN NOT NULL DEFAULT true,
 fecha_desde DATE NOT NULL, fecha_hasta DATE, activo BOOLEAN NOT NULL DEFAULT true,
 CHECK (fecha_hasta IS NULL OR fecha_hasta >= fecha_desde)
);
CREATE TABLE campo_tarea_locales (
 tarea_id INT NOT NULL REFERENCES campo_tareas(id), local_id INT NOT NULL REFERENCES campo_locales(id), PRIMARY KEY(tarea_id, local_id)
);
CREATE TABLE campo_visitas (
 id SERIAL PRIMARY KEY, local_id INT NOT NULL REFERENCES campo_locales(id), asignacion_id INT NOT NULL REFERENCES campo_asignaciones(id),
 usuario_id INT NOT NULL REFERENCES usuarios(id), horario_id INT REFERENCES campo_horarios(id), fecha DATE NOT NULL,
 entrada TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, salida TIMESTAMP(3), es_backup BOOLEAN NOT NULL DEFAULT false,
 entrada_lat DOUBLE PRECISION, entrada_lng DOUBLE PRECISION, salida_lat DOUBLE PRECISION, salida_lng DOUBLE PRECISION,
 nota_entrada VARCHAR(250) NOT NULL DEFAULT '', nota_salida VARCHAR(250) NOT NULL DEFAULT '',
 CHECK (salida IS NULL OR salida >= entrada)
);
CREATE TABLE campo_cumplimientos (
 visita_id INT NOT NULL REFERENCES campo_visitas(id), tarea_id INT NOT NULL REFERENCES campo_tareas(id),
 nombre_tarea VARCHAR(120) NOT NULL, completada_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(visita_id, tarea_id)
);
CREATE INDEX campo_clientes_empresa_id_activo_nombre_idx ON campo_clientes(empresa_id, activo, nombre);
CREATE INDEX campo_locales_cliente_id_activo_idx ON campo_locales(cliente_id, activo);
CREATE INDEX campo_horarios_local_id_activo_idx ON campo_horarios(local_id, activo);
CREATE INDEX campo_asignaciones_usuario_id_activo_fecha_desde_idx ON campo_asignaciones(usuario_id, activo, fecha_desde);
CREATE INDEX campo_asignaciones_local_id_activo_idx ON campo_asignaciones(local_id, activo);
CREATE INDEX campo_backups_asignacion_id_activo_fecha_desde_idx ON campo_backups(asignacion_id, activo, fecha_desde);
CREATE INDEX campo_backups_usuario_id_activo_idx ON campo_backups(usuario_id, activo);
CREATE INDEX campo_tareas_empresa_id_activo_fecha_desde_idx ON campo_tareas(empresa_id, activo, fecha_desde);
CREATE INDEX campo_tarea_locales_local_id_idx ON campo_tarea_locales(local_id);
CREATE INDEX campo_visitas_usuario_id_fecha_idx ON campo_visitas(usuario_id, fecha);
CREATE INDEX campo_visitas_local_id_fecha_idx ON campo_visitas(local_id, fecha);
CREATE UNIQUE INDEX campo_visitas_asignacion_id_horario_id_fecha_key ON campo_visitas(asignacion_id, horario_id, fecha);
-- Prisma no representa índices parciales: previenen dobles clics y entradas concurrentes.
CREATE UNIQUE INDEX campo_visita_abierta_usuario ON campo_visitas(usuario_id) WHERE salida IS NULL;
CREATE UNIQUE INDEX campo_visita_sin_horario ON campo_visitas(asignacion_id, fecha) WHERE horario_id IS NULL;

-- Catálogo reutilizable. Ninguna autorización del código depende del nombre del rol.
INSERT INTO modulos(nombre, ruta, icono, orden, activo, updated_at)
VALUES ('Gestión de campo', 'gestion-campo', 'clientes', 10, true, CURRENT_TIMESTAMP),
       ('Mi jornada', 'mi-jornada', 'calendario', 20, true, CURRENT_TIMESTAMP)
ON CONFLICT (ruta) DO NOTHING;
INSERT INTO paginas(modulo_id, nombre, ruta, orden, activo, updated_at)
SELECT m.id, p.nombre, p.ruta, p.orden, true, CURRENT_TIMESTAMP FROM modulos m
CROSS JOIN (VALUES ('Clientes', 'clientes', 1), ('Locales y planificación', 'locales', 2), ('Tareas', 'tareas', 3), ('Presencias del equipo', 'visitas', 4)) AS p(nombre,ruta,orden)
WHERE m.ruta = 'gestion-campo' ON CONFLICT (modulo_id,ruta) DO NOTHING;
INSERT INTO paginas(modulo_id, nombre, ruta, orden, activo, updated_at)
SELECT m.id, p.nombre, p.ruta, p.orden, true, CURRENT_TIMESTAMP FROM modulos m
CROSS JOIN (VALUES ('Mis locales', 'locales', 1), ('Mis tareas del día', 'tareas', 2)) AS p(nombre,ruta,orden)
WHERE m.ruta = 'mi-jornada' ON CONFLICT (modulo_id,ruta) DO NOTHING;

-- Configuración inicial solicitada para Guaraní; otras empresas/roles se habilitan desde Administración.
INSERT INTO empresa_modulos(empresa_id,modulo_id,todas_las_paginas,rol_ids)
SELECT e.id, m.id, true, array_agg(r.id ORDER BY r.id)
FROM empresas e JOIN roles r ON r.empresa_id = e.id CROSS JOIN modulos m
WHERE lower(translate(e.nombre,'ÁÉÍÓÚáéíóú','AEIOUaeiou')) = 'guarani'
AND ((m.ruta = 'gestion-campo' AND regexp_replace(lower(r.descripcion),'[^a-z]','','g') = 'teamleader')
  OR (m.ruta = 'mi-jornada' AND regexp_replace(lower(r.descripcion),'[^a-z]','','g') = 'impulsador'))
GROUP BY e.id,m.id ON CONFLICT (empresa_id,modulo_id) DO NOTHING;
COMMIT;
