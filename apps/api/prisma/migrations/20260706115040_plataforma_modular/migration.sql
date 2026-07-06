-- CreateEnum
CREATE TYPE "TipoEjecutable" AS ENUM ('PROCEDURE', 'FUNCTION', 'VIEW', 'QUERY');

-- CreateEnum
CREATE TYPE "MotorBd" AS ENUM ('POSTGRESQL', 'SAP_HANA', 'ORACLE', 'MYSQL', 'SQLSERVER');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "es_superadmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "modulos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "icono" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paginas" (
    "id" SERIAL NOT NULL,
    "modulo_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "icono" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paginas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ejecutables" (
    "id" SERIAL NOT NULL,
    "pagina_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoEjecutable" NOT NULL,
    "motor" "MotorBd" NOT NULL DEFAULT 'POSTGRESQL',
    "conexion_id" INTEGER,
    "sentencia" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ejecutables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa_modulos" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "modulo_id" INTEGER NOT NULL,
    "todas_las_paginas" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_modulos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa_paginas" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "pagina_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresa_paginas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "modulos_ruta_key" ON "modulos"("ruta");

-- CreateIndex
CREATE UNIQUE INDEX "paginas_modulo_id_ruta_key" ON "paginas"("modulo_id", "ruta");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_modulos_empresa_id_modulo_id_key" ON "empresa_modulos"("empresa_id", "modulo_id");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_paginas_empresa_id_pagina_id_key" ON "empresa_paginas"("empresa_id", "pagina_id");

-- AddForeignKey
ALTER TABLE "paginas" ADD CONSTRAINT "paginas_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ejecutables" ADD CONSTRAINT "ejecutables_pagina_id_fkey" FOREIGN KEY ("pagina_id") REFERENCES "paginas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ejecutables" ADD CONSTRAINT "ejecutables_conexion_id_fkey" FOREIGN KEY ("conexion_id") REFERENCES "conexiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa_modulos" ADD CONSTRAINT "empresa_modulos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa_modulos" ADD CONSTRAINT "empresa_modulos_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "modulos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa_paginas" ADD CONSTRAINT "empresa_paginas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa_paginas" ADD CONSTRAINT "empresa_paginas_pagina_id_fkey" FOREIGN KEY ("pagina_id") REFERENCES "paginas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: módulos y páginas de ejemplo (el superadmin los administra desde el ABM)
INSERT INTO "modulos" ("nombre", "ruta", "icono", "orden") VALUES
    ('Ventas', 'ventas', 'ventas', 1),
    ('Clientes', 'clientes', 'clientes', 2),
    ('Reportes', 'reportes', 'reportes', 3);

INSERT INTO "paginas" ("modulo_id", "nombre", "ruta", "orden")
SELECT m.id, p.nombre, p.ruta, p.orden FROM "modulos" m
CROSS JOIN (VALUES
    ('ventas', 'Pedidos', 'pedidos', 1),
    ('ventas', 'Facturación', 'facturacion', 2),
    ('clientes', 'Listado de clientes', 'listado', 1),
    ('reportes', 'Ventas por vendedor', 'ventas-vendedor', 1)
) AS p(modulo_ruta, nombre, ruta, orden)
WHERE m.ruta = p.modulo_ruta;

-- Seed: un ejecutable de ejemplo en PostgreSQL (query sobre la propia base)
INSERT INTO "ejecutables" ("pagina_id", "nombre", "tipo", "motor", "sentencia", "orden")
SELECT p.id, 'Clientes activos', 'QUERY', 'POSTGRESQL',
       'SELECT id, nombre FROM empresas ORDER BY nombre', 1
FROM "paginas" p JOIN "modulos" m ON m.id = p.modulo_id
WHERE m.ruta = 'clientes' AND p.ruta = 'listado';

-- Seed: FRIGORIFICO GUARANI habilita Ventas (todas las páginas) y Clientes (todas)
INSERT INTO "empresa_modulos" ("empresa_id", "modulo_id", "todas_las_paginas")
SELECT e.id, m.id, true FROM "empresas" e CROSS JOIN "modulos" m
WHERE e.nombre = 'FRIGORIFICO GUARANI' AND m.ruta IN ('ventas', 'clientes');

-- Seed: marcar al usuario de prueba como superadmin (si existe)
UPDATE "usuarios" SET "es_superadmin" = true WHERE "nombre_login" = 'carlos.morteira';
