---
type: "architecture"
date: "2026-08-14T13:11:56.158586+00:00"
question: "Cómo refactorizar las tablas de tareas para soportar empresa, equipos, usuarios, clientes, locales, exclusiones e historial"
contributor: "graphify"
outcome: "useful"
---

# Q: Cómo refactorizar las tablas de tareas para soportar empresa, equipos, usuarios, clientes, locales, exclusiones e historial

## Answer

Se consolidaron TareaGlobal y TareaCliente en Tarea; TareaUsuario representa INCLUIR/EXCLUIR, TareaLocal limita locales y VisitaTarea conserva snapshots históricos. Los alcances dinámicos son EMPRESA, EQUIPO_DIRECTO, EQUIPO_COMPLETO y SELECCIONADOS, cruzados con TODOS, CLIENTE o SELECCIONADOS para locales. La migración preserva IDs canónicos, asignaciones, exclusiones y respuestas históricas.

## Outcome

- Signal: useful