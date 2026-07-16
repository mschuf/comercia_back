-- Acelera los filtros temporales de los indicadores de Team Leader y la
-- búsqueda de visitas todavía abiertas.
CREATE INDEX "visitas_iniciada_en_idx" ON "visitas"("iniciada_en");
CREATE INDEX "visitas_completada_en_idx" ON "visitas"("completada_en");
