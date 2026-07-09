-- Alta idempotente del módulo Impulsador y sus páginas (locales, mapa, visitas).
-- Son datos de plataforma: si ya existen (cargados por el ABM del superadmin)
-- no se tocan (ON CONFLICT DO NOTHING). Qué empresa/rol los ve se sigue
-- asignando desde el panel de administración.
INSERT INTO "modulos" ("nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at")
VALUES ('Impulsador', 'impulsador', NULL, 0, true, now(), now())
ON CONFLICT ("ruta") DO NOTHING;

INSERT INTO "paginas" ("modulo_id", "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at")
SELECT m."id", 'Locales', 'locales', NULL, 1, true, now(), now()
FROM "modulos" m WHERE m."ruta" = 'impulsador'
ON CONFLICT ("modulo_id", "ruta") DO NOTHING;

INSERT INTO "paginas" ("modulo_id", "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at")
SELECT m."id", 'Mapa', 'mapa', NULL, 2, true, now(), now()
FROM "modulos" m WHERE m."ruta" = 'impulsador'
ON CONFLICT ("modulo_id", "ruta") DO NOTHING;

INSERT INTO "paginas" ("modulo_id", "nombre", "ruta", "icono", "orden", "activo", "created_at", "updated_at")
SELECT m."id", 'Visitas', 'visitas', NULL, 3, true, now(), now()
FROM "modulos" m WHERE m."ruta" = 'impulsador'
ON CONFLICT ("modulo_id", "ruta") DO NOTHING;
