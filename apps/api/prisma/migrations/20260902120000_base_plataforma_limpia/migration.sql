-- Retira los módulos de operación de campo y sus datos.
DROP TABLE IF EXISTS "novedades_tarea";
DROP TABLE IF EXISTS "visita_tareas";
DROP TABLE IF EXISTS "rutas_diarias_repositor";
DROP TABLE IF EXISTS "visitas";
DROP TABLE IF EXISTS "programaciones_visita";
DROP TABLE IF EXISTS "tarea_locales";
DROP TABLE IF EXISTS "tarea_usuarios";
DROP TABLE IF EXISTS "tareas";
DROP TABLE IF EXISTS "locales";
DROP TABLE IF EXISTS "clientes";
DROP TABLE IF EXISTS "zona_usuarios";
DROP TABLE IF EXISTS "zonas";
DROP TABLE IF EXISTS "territorios";
DROP TABLE IF EXISTS "consentimientos_ubicacion";
DROP TABLE IF EXISTS "ubicaciones_usuario";

DROP TYPE IF EXISTS "AlcanceUsuariosTarea";
DROP TYPE IF EXISTS "AlcanceLocalesTarea";
DROP TYPE IF EXISTS "EfectoTareaUsuario";
DROP TYPE IF EXISTS "FrecuenciaVisita";

-- La nueva base comienza sin cuentas, roles ni configuración de plataforma.
TRUNCATE TABLE
  "empresa_paginas",
  "empresa_modulos",
  "ejecutables",
  "paginas",
  "modulos",
  "conexiones",
  "usuarios",
  "roles",
  "empresas"
RESTART IDENTITY CASCADE;
