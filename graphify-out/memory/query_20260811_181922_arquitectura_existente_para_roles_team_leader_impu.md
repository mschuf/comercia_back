---
type: "architecture"
date: "2026-08-11T18:19:22.582539+00:00"
question: "Arquitectura existente para roles Team Leader/Impulsador, asignación de locales, tareas dirigidas, visitas, rendimiento y notificaciones móviles"
contributor: "graphify"
outcome: "useful"
source_nodes: ["TareaGlobal", "Local", "ProgramacionVisita", "Visita", "RepositorService", "VisitasService", "AccesoOperacionesCampoService"]
---

# Q: Arquitectura existente para roles Team Leader/Impulsador, asignación de locales, tareas dirigidas, visitas, rendimiento y notificaciones móviles

## Answer

El repositorio ya contiene agenda de locales, programación con horarios, radio por local, entrada/salida geoverificada, historial, checklist y KPIs bajo los módulos legacy supervisor/repositor. La implementación debe reutilizar esos dominios, agregar destinatarios por usuario a tareas, exponer DTOs móviles específicos, incorporar proximidad/notificación local y migrar accesos/usuarios a teamleader.impulsador e impulsador sin seguimiento periódico para el rol impulsador.

## Outcome

- Signal: useful

## Source Nodes

- TareaGlobal
- Local
- ProgramacionVisita
- Visita
- RepositorService
- VisitasService
- AccesoOperacionesCampoService