---
type: "query"
date: "2026-08-12T18:52:56.603705+00:00"
question: "En producción el login da CORS y el front dice No se pudo conectar con el servidor; verificar qué pasa"
contributor: "graphify"
outcome: "useful"
source_nodes: ["PresentismoModule", "JwtAuthGuard", "AuthModule", "parseCorsOrigins()"]
---

# Q: En producción el login da CORS y el front dice No se pudo conectar con el servidor; verificar qué pasa

## Answer

Expanded from original query via vocab: [cors, origins, configuration, login, api, fetch, production]. El preflight y health públicos devuelven 502 de Cloudflare porque comercia-api-1 reinicia. Los logs muestran UnknownDependenciesException: JwtAuthGuard no puede resolver JwtService dentro de PresentismoModule. CORS_ORIGINS y FRONTEND_URL sí están correctamente configurados como https://app.comercia.pro. La corrección es importar AuthModule en PresentismoModule y desplegar; conviene agregar una prueba de bootstrap.

## Outcome

- Signal: useful

## Source Nodes

- PresentismoModule
- JwtAuthGuard
- AuthModule
- parseCorsOrigins()