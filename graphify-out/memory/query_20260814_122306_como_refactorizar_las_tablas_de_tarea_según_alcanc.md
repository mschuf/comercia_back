---
type: "architecture"
date: "2026-08-14T12:23:06.071934+00:00"
question: "Como refactorizar las tablas de tarea según alcance global, por equipo, usuario, cliente/local e historial de visitas"
contributor: "graphify"
outcome: "useful"
source_nodes: ["TareaGlobal", "TareasService", "TareaCliente", "TareaGlobalUsuario", "TareaGlobalExclusionUsuario", "TareaGlobalLocal", "TareaClienteExclusionUsuario", "TareasLocalService", "VisitaTarea", "VisitasService"]
---

# Q: Como refactorizar las tablas de tarea según alcance global, por equipo, usuario, cliente/local e historial de visitas

## Answer

Recomendar un modelo normalizado de cuatro tablas de tarea: Tarea canónica con alcance de usuario/local, TareaUsuario unificada con efectos INCLUIR/EXCLUIR, TareaLocal para locales exactos y VisitaTarea como ejecución con snapshot inmutable. Eliminar la duplicación TareaGlobal a TareaCliente y unificar las dos tablas de exclusión. Mantener ProgramacionVisita y NovedadTarea separadas. Migrar de forma aditiva, hacer backfill, cortar lecturas y finalmente retirar tablas viejas.

## Outcome

- Signal: useful

## Source Nodes

- TareaGlobal
- TareasService
- TareaCliente
- TareaGlobalUsuario
- TareaGlobalExclusionUsuario
- TareaGlobalLocal
- TareaClienteExclusionUsuario
- TareasLocalService
- VisitaTarea
- VisitasService
- NovedadTarea
- ProgramacionVisita