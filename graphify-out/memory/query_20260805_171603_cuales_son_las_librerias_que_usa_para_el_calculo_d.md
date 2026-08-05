---
type: "query"
date: "2026-08-05T17:16:03.384852+00:00"
question: "cuales son las librerias que usa para el calculo de ruta"
contributor: "graphify"
outcome: "useful"
source_nodes: ["OsrmService", "matrizHaversine", "leaflet", "optimizacion-ruta.ts"]
---

# Q: cuales son las librerias que usa para el calculo de ruta

## Answer

Expanded from original query via vocab: [ruta, calcular, calculo, distancia, haversine, leaflet, mapa, geolocalizacion, osrm]. The route system uses OsrmService for OSRM routing and table methods, an in-project Haversine distance matrix and optimizarParadas logic, and Leaflet for displaying the map. Leaflet is a visual dependency rather than the route-calculation engine.

## Outcome

- Signal: useful

## Source Nodes

- OsrmService
- matrizHaversine
- leaflet
- optimizacion-ruta.ts