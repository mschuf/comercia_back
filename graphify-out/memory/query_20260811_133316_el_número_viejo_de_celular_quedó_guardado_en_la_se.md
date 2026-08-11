---
type: "query"
date: "2026-08-11T13:33:16.261843+00:00"
question: "El número viejo de celular quedó guardado en la sesión y quiero que no vuelva a pasar"
contributor: "graphify"
outcome: "useful"
source_nodes: ["sesion.ts", "App.tsx", "AuthService"]
---

# Q: El número viejo de celular quedó guardado en la sesión y quiero que no vuelva a pasar

## Answer

Expanded from original query via graph vocab: [auth, sesion, mobile, celular, sim, usuario, nombre, numero, phone]. La causa era SesionMovil persistida en SecureStore: App.tsx restauraba el perfil cacheado y mostraba sesion.usuario.celular sin refrescar /auth/me. Se agregó obtenerUsuarioActual y refrescarPerfil al iniciar, reconectar y volver al primer plano; conserva el perfil offline y reemplaza los datos cacheados al recuperar internet. Verificado en Samsung: la misma sesión cambió de +595971123456 a +595972777464 sin cerrar sesión y mantuvo el seguimiento activo.

## Outcome

- Signal: useful

## Source Nodes

- sesion.ts
- App.tsx
- AuthService