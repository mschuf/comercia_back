---
type: "implementation"
date: "2026-08-14T11:46:52.417193+00:00"
question: "Como quitar todas las tareas solamente de un usuario respetando la jerarquia"
contributor: "graphify"
outcome: "useful"
source_nodes: ["TareasService", ".quitarTodasDeUsuario()", "filtroTareaGlobalVisiblePara()", ".validarOperativosDelGestor()", "TareasQuitadasUsuarioDto", "tareasVisiblesPara()"]
---

# Q: Como quitar todas las tareas solamente de un usuario respetando la jerarquia

## Answer

Se agregaron exclusiones auditables por usuario para tareas globales y tareas de cliente, autorizadas con validarOperativosDelGestor. El endpoint DELETE /tareas/usuarios/:usuarioId elimina destinatarios explicitos, conserva las tareas compartidas y el historial con contenido, y limpia pendientes vacios de visitas abiertas. La UI permite elegir una persona y muestra confirmacion.

## Outcome

- Signal: useful

## Source Nodes

- TareasService
- .quitarTodasDeUsuario()
- filtroTareaGlobalVisiblePara()
- .validarOperativosDelGestor()
- TareasQuitadasUsuarioDto
- tareasVisiblesPara()