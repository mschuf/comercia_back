-- AlterTable
ALTER TABLE "locales" ADD COLUMN     "fecha_visita" TIMESTAMP(3),
ADD COLUMN     "radio_metros" INTEGER,
ADD COLUMN     "requiere_foto_presencia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zona_id" INTEGER;

-- CreateTable
CREATE TABLE "territorios" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#047857',
    "poligono" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "territorios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zonas" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "territorio_id" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#0284c7',
    "poligono" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_por_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "zonas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_local" (
    "id" SERIAL NOT NULL,
    "local_id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "requiere_foto" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tareas_local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas" (
    "id" SERIAL NOT NULL,
    "local_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "iniciada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completada_en" TIMESTAMP(3),
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "distancia_metros" DOUBLE PRECISION NOT NULL,
    "latitud_fin" DOUBLE PRECISION,
    "longitud_fin" DOUBLE PRECISION,
    "distancia_fin_metros" DOUBLE PRECISION,
    "foto_presencia" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visita_tareas" (
    "id" SERIAL NOT NULL,
    "visita_id" INTEGER NOT NULL,
    "tarea_id" INTEGER NOT NULL,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "comentario" TEXT,
    "foto" TEXT,
    "completada_en" TIMESTAMP(3),

    CONSTRAINT "visita_tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_impulsador" (
    "id" SERIAL NOT NULL,
    "empresa_id" INTEGER NOT NULL,
    "rol_gestor_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "rol_operativo_ids" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "radio_metros_defecto" INTEGER NOT NULL DEFAULT 200,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_impulsador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitas_local_id_usuario_id_idx" ON "visitas"("local_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "visita_tareas_visita_id_tarea_id_key" ON "visita_tareas"("visita_id", "tarea_id");

-- CreateIndex
CREATE UNIQUE INDEX "config_impulsador_empresa_id_key" ON "config_impulsador"("empresa_id");

-- AddForeignKey
ALTER TABLE "territorios" ADD CONSTRAINT "territorios_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "territorios" ADD CONSTRAINT "territorios_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_territorio_id_fkey" FOREIGN KEY ("territorio_id") REFERENCES "territorios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonas" ADD CONSTRAINT "zonas_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locales" ADD CONSTRAINT "locales_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zonas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_local" ADD CONSTRAINT "tareas_local_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_tareas" ADD CONSTRAINT "visita_tareas_visita_id_fkey" FOREIGN KEY ("visita_id") REFERENCES "visitas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_tareas" ADD CONSTRAINT "visita_tareas_tarea_id_fkey" FOREIGN KEY ("tarea_id") REFERENCES "tareas_local"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_impulsador" ADD CONSTRAINT "config_impulsador_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
