---
type: "query"
date: "2026-08-07T19:41:11.586270+00:00"
question: "en que tabla puedo ver que se guarda los datos de la ubi etc del usuario? ademas quiero que se envie la ubi cada 1min etc de los usuarios"
contributor: "graphify"
outcome: "useful"
source_nodes: ["UbicacionUsuario", "UbicacionesService", "seguimiento.ts"]
---

# Q: en que tabla puedo ver que se guarda los datos de la ubi etc del usuario? ademas quiero que se envie la ubi cada 1min etc de los usuarios

## Answer

Expanded from graph vocab: [ubicacion, geolocalizacion, location, mobile, usuario, user, latest]. La tabla es ubicaciones_usuario, con usuario_id, latitud, longitud, precision_metros, registrada_en, recibida_en, correo_usuario y celular_usuario. El consentimiento vive en consentimientos_ubicacion. seguimiento.ts usa un intervalo de 60000 ms y publica POST /ubicaciones al activarse, pero produccion actualmente responde 404 a /api/v1/ubicaciones, por lo que debe desplegarse el backend antes de que se guarden datos reales.

## Outcome

- Signal: useful

## Source Nodes

- UbicacionUsuario
- UbicacionesService
- seguimiento.ts