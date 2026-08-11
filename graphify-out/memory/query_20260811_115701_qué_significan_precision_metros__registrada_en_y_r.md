---
type: "query"
date: "2026-08-11T11:57:01.864613+00:00"
question: "Qué significan precision_metros, registrada_en y recibida_en en ubicaciones_usuario"
contributor: "graphify"
outcome: "useful"
source_nodes: ["seguimiento.ts", "UbicacionesService", "RegistrarUbicacionDto"]
---

# Q: Qué significan precision_metros, registrada_en y recibida_en en ubicaciones_usuario

## Answer

Expanded from original query via graph vocab: [ubicacion, ubicaciones, precision, metros, registrar, registro, usuario, fecha]. precision_metros proviene de coords.accuracy del teléfono y representa el radio estimado de incertidumbre en metros; menor es mejor y puede ser null. registrada_en proviene de ubicacion.timestamp y representa cuándo el teléfono obtuvo esa medición. recibida_en usa DEFAULT CURRENT_TIMESTAMP y representa cuándo PostgreSQL insertó la fila. recibida_en - registrada_en es la demora de entrega o procesamiento, no la precisión GPS.

## Outcome

- Signal: useful

## Source Nodes

- seguimiento.ts
- UbicacionesService
- RegistrarUbicacionDto