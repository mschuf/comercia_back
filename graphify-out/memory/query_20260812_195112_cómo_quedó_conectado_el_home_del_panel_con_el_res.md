---
type: "implementation"
date: "2026-08-12T19:51:12.455547+00:00"
question: "¿Cómo quedó conectado el home del panel con el resumen de presentismo operativo y sus rutas de detalle?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["PanelInicioPage", "ResumenInicioOperativo", "PresentismoService"]
---

# Q: ¿Cómo quedó conectado el home del panel con el resumen de presentismo operativo y sus rutas de detalle?

## Answer

PanelInicioPage muestra ResumenInicioOperativo para módulos de campo. El componente consume GET /presentismo/inicio, cuyo servicio aplica el alcance jerárquico con AccesoOperacionesCampoService, calcula día/semana/mes y entrega KPI mínimos. Las tarjetas resuelven destinos solo entre páginas habilitadas mediante hrefDisponible.

## Outcome

- Signal: useful

## Source Nodes

- PanelInicioPage
- ResumenInicioOperativo
- PresentismoService