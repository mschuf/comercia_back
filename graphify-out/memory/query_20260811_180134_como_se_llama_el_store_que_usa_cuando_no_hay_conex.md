---
type: "query"
date: "2026-08-11T18:01:34.963730+00:00"
question: "como se llama el store que usa cuando no hay conexion y guarda en el celular, y se borra una vez que se envia al servidor"
contributor: "graphify"
outcome: "useful"
source_nodes: ["cola-ubicaciones.ts", "ejecutarSincronizacion()"]
---

# Q: como se llama el store que usa cuando no hay conexion y guarda en el celular, y se borra una vez que se envia al servidor

## Answer

Expanded from graph vocab: [sqlite, cola, pendientes, sincronizar, eliminar, ubicaciones]. La cola offline es una base SQLite local llamada comercia-ubicaciones.db, con tabla ubicaciones_pendientes. Cada ubicación se conserva hasta que el API confirma la recepción; entonces eliminarUbicacionPendiente ejecuta DELETE. Si falla el envío, registra el intento y conserva la fila para reintentar. SecureStore solo conserva sesión y estados, no el historial de ubicaciones.

## Outcome

- Signal: useful

## Source Nodes

- cola-ubicaciones.ts
- ejecutarSincronizacion()