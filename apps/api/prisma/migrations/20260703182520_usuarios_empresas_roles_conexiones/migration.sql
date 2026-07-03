/*
  Warnings:

  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "users";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "db_name" TEXT,
    "empresas_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conexiones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "servernode" TEXT,
    "user_db" TEXT,
    "password_db" TEXT,
    "service_layer" TEXT,
    "version_tls" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conexiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "roles_id" INTEGER,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "nombre_login" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "ruc" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "rol_id" INTEGER,
    "superior_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_nombre_key" ON "empresas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "conexiones_nombre_key" ON "conexiones"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "roles_descripcion_key" ON "roles"("descripcion");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_nombre_login_key" ON "usuarios"("nombre_login");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_ruc_key" ON "usuarios"("ruc");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_empresas_id_fkey" FOREIGN KEY ("empresas_id") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_roles_id_fkey" FOREIGN KEY ("roles_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_superior_id_fkey" FOREIGN KEY ("superior_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed: roles iniciales
INSERT INTO "roles" ("descripcion") VALUES
    ('GERENTE'),
    ('JEFE'),
    ('SUPERVISOR'),
    ('VENDEDOR'),
    ('TEAMLEADER'),
    ('REPOSITOR'),
    ('IMPULSADOR'),
    ('CHOFER');

-- Seed: empresa por defecto
INSERT INTO "empresas" ("nombre", "db_name") VALUES
    ('FRIGORIFICO GUARANI', 'COMERCIA_DEFAULT');

-- Seed: conexión por defecto (placeholders, se configuran de verdad más adelante)
INSERT INTO "conexiones" ("nombre", "servernode", "user_db", "password_db", "service_layer", "version_tls") VALUES
    ('CONEXION DEFAULT', 'localhost', 'sa', 'cambiar-en-produccion', 'https://localhost:50000/b1s/v1', '1.2');
