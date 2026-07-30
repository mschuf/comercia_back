-- Acelera el listado estable que consulta la campana por destinatario.
CREATE INDEX "novedades_tarea_supervisor_id_reportada_en_id_idx"
ON "novedades_tarea"("supervisor_id", "reportada_en", "id");
