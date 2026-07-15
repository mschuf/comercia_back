BEGIN;

-- El titulo identifica la tarea, mientras que la descripcion conserva las
-- instrucciones que recibe el repositor.
ALTER TABLE "tareas_globales" ADD COLUMN "titulo" TEXT;
ALTER TABLE "tareas_cliente" ADD COLUMN "titulo" TEXT;

-- Genera titulos legibles desde las descripciones actuales. Se limita cada
-- titulo a 120 caracteres y, ante una colision dentro de la misma empresa,
-- agrega un sufijo numerado sin superar ese limite.
DO $migration$
DECLARE
  tarea RECORD;
  titulo_base TEXT;
  titulo_candidato TEXT;
  sufijo TEXT;
  numero INTEGER;
BEGIN
  FOR tarea IN
    SELECT "id", "empresa_id", "descripcion"
    FROM "tareas_globales"
    ORDER BY "empresa_id", "id"
  LOOP
    titulo_base := LEFT(
      COALESCE(
        NULLIF(
          BTRIM(REGEXP_REPLACE(tarea."descripcion", '[[:space:]]+', ' ', 'g')),
          ''
        ),
        'Tarea'
      ),
      120
    );
    titulo_candidato := titulo_base;
    numero := 2;

    WHILE EXISTS (
      SELECT 1
      FROM "tareas_globales" existente
      WHERE existente."empresa_id" = tarea."empresa_id"
        AND existente."titulo" = titulo_candidato
        AND existente."id" <> tarea."id"
    ) LOOP
      sufijo := ' (' || numero::TEXT || ')';
      titulo_candidato := LEFT(
        titulo_base,
        GREATEST(1, 120 - CHAR_LENGTH(sufijo))
      ) || sufijo;
      numero := numero + 1;
    END LOOP;

    UPDATE "tareas_globales"
    SET "titulo" = titulo_candidato
    WHERE "id" = tarea."id";
  END LOOP;
END;
$migration$;

-- Las copias vinculadas conservan exactamente el titulo de su tarea maestra.
UPDATE "tareas_cliente" cliente
SET "titulo" = tg."titulo"
FROM "tareas_globales" tg
WHERE cliente."tarea_global_id" = tg."id";

-- Las tareas legadas que no tienen maestra tambien reciben un titulo derivado
-- de su descripcion. No requieren desambiguacion porque no existe una
-- restriccion de titulo unico por cliente.
UPDATE "tareas_cliente"
SET "titulo" = LEFT(
  COALESCE(
    NULLIF(
      BTRIM(REGEXP_REPLACE("descripcion", '[[:space:]]+', ' ', 'g')),
      ''
    ),
    'Tarea'
  ),
  120
)
WHERE "titulo" IS NULL;

ALTER TABLE "tareas_globales" ALTER COLUMN "titulo" SET NOT NULL;
ALTER TABLE "tareas_cliente" ALTER COLUMN "titulo" SET NOT NULL;

DROP INDEX IF EXISTS "tareas_globales_empresa_id_descripcion_key";
CREATE UNIQUE INDEX "tareas_globales_empresa_id_titulo_key"
  ON "tareas_globales"("empresa_id", "titulo");

COMMIT;
