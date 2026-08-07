-- Consentimiento explícito de seguimiento por usuario. La revocación impide
-- que el endpoint de ubicaciones acepte nuevas coordenadas.
CREATE TABLE "consentimientos_ubicacion" (
    "usuario_id" INTEGER NOT NULL,
    "otorgado_en" TIMESTAMP(3) NOT NULL,
    "revocado_en" TIMESTAMP(3),
    "version_politica" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consentimientos_ubicacion_pkey" PRIMARY KEY ("usuario_id")
);

CREATE TABLE "ubicaciones_usuario" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "precision_metros" DOUBLE PRECISION,
    "registrada_en" TIMESTAMP(3) NOT NULL,
    "recibida_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correo_usuario" TEXT NOT NULL,
    "celular_usuario" TEXT NOT NULL,

    CONSTRAINT "ubicaciones_usuario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ubicaciones_usuario_usuario_id_registrada_en_idx"
ON "ubicaciones_usuario"("usuario_id", "registrada_en" DESC);

ALTER TABLE "consentimientos_ubicacion"
ADD CONSTRAINT "consentimientos_ubicacion_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ubicaciones_usuario"
ADD CONSTRAINT "ubicaciones_usuario_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
