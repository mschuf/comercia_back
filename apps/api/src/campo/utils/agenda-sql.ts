import { Prisma } from '../../../generated/prisma/client';

// Alias fijos de tablas; todos los valores externos se parametrizan.
export function condicionAgenda(
  empresaId: number,
  usuarioId: number,
  fecha: string,
) {
  return Prisma.sql`
    c.empresa_id = ${empresaId} AND c.activo AND l.activo AND a.activo
    AND a.fecha_desde <= ${fecha}::date AND (a.fecha_hasta IS NULL OR a.fecha_hasta >= ${fecha}::date)
    AND (
      (a.usuario_id = ${usuarioId} AND NOT EXISTS (
        SELECT 1 FROM campo_backups b WHERE b.asignacion_id = a.id AND b.activo
        AND ${fecha}::date BETWEEN b.fecha_desde AND b.fecha_hasta
      )) OR EXISTS (
        SELECT 1 FROM campo_backups b WHERE b.asignacion_id = a.id AND b.activo AND b.usuario_id = ${usuarioId}
        AND ${fecha}::date BETWEEN b.fecha_desde AND b.fecha_hasta
      )
    ) AND (
      NOT EXISTS (SELECT 1 FROM campo_horarios h WHERE h.local_id = l.id AND h.activo)
      OR EXISTS (
        SELECT 1 FROM campo_horarios h WHERE h.local_id = l.id AND h.activo
        AND h.fecha_desde <= ${fecha}::date AND (h.fecha_hasta IS NULL OR h.fecha_hasta >= ${fecha}::date)
        AND (
          (h.frecuencia = 'DIARIA' AND (${fecha}::date - h.fecha_desde) % h.intervalo = 0)
          OR (h.frecuencia = 'SEMANAL' AND EXTRACT(ISODOW FROM ${fecha}::date)::int = ANY(h.dias_semana)
            AND ((${fecha}::date - h.fecha_desde + EXTRACT(ISODOW FROM h.fecha_desde)::int - 1) / 7) % h.intervalo = 0)
          OR (h.frecuencia = 'MENSUAL' AND EXTRACT(DAY FROM ${fecha}::date)::int = ANY(h.dias_mes)
            AND ((EXTRACT(YEAR FROM ${fecha}::date)::int - EXTRACT(YEAR FROM h.fecha_desde)::int) * 12
              + EXTRACT(MONTH FROM ${fecha}::date)::int - EXTRACT(MONTH FROM h.fecha_desde)::int) % h.intervalo = 0)
        )
      )
    )`;
}
