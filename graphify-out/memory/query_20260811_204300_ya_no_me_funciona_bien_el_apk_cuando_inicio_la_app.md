---
type: "query"
date: "2026-08-11T20:43:00.690748+00:00"
question: "ya no me funciona bien el apk cuando inicio la app nunca mas esta reconociendo las sim's para traer los nros de telefono e iniciar automaticamente el login, corregir eso"
contributor: "graphify"
outcome: "useful"
source_nodes: ["NumeroSimNativo", "sim.ts", "with-sim-phone-numbers.js", "App.tsx", "AuthService"]
---

# Q: ya no me funciona bien el apk cuando inicio la app nunca mas esta reconociendo las sim's para traer los nros de telefono e iniciar automaticamente el login, corregir eso

## Answer

Expanded from original query via graph vocab: [android, sim, phone, numero, numeros, login, auth, sesion, movil]. El flujo App.tsx llama a sim.ts, que usa SimPhoneNumbersModule y luego auth/mobile/sim-login. La API productiva reconoció el número esperado; el problema era depender sólo de la lectura silenciosa, que Android puede devolver vacía. Se agregó Phone Number Hint como fallback automático y se validó dentro del APK 1.2.1.

## Outcome

- Signal: useful

## Source Nodes

- NumeroSimNativo
- sim.ts
- with-sim-phone-numbers.js
- App.tsx
- AuthService