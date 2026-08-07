---
type: "query"
date: "2026-08-07T19:43:59.178605+00:00"
question: "el back en api.comercia.pro funciona, hice un login y funciono https://api.comercia.pro/api/v1/auth/login"
contributor: "graphify"
outcome: "useful"
source_nodes: ["AuthController", "SesionMovil", "seguimiento.ts"]
---

# Q: el back en api.comercia.pro funciona, hice un login y funciono https://api.comercia.pro/api/v1/auth/login

## Answer

Expanded from graph vocab: [api, auth, login, mobile, password, sesion, token, usuario]. Correcto: /auth/login es el login web y funciona porque devuelve usuario y deja el JWT en una cookie HttpOnly. La app nativa necesita el token en el JSON para guardarlo de forma segura y usar Authorization Bearer desde la tarea en segundo plano; por eso usa /auth/mobile/login. Produccion no tiene publicadas aun las rutas /auth/mobile/login, /auth/mobile/sim-login ni /ubicaciones, que devuelven 404. Reutilizar /auth/login no resuelve el seguimiento ni entrega el token necesario.

## Outcome

- Signal: useful

## Source Nodes

- AuthController
- SesionMovil
- seguimiento.ts