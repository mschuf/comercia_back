# Graph Report - .  (2026-08-03)

## Corpus Check
- 308 files · ~96,751 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1995 nodes · 4627 edges · 142 communities (102 shown, 40 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 27 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API Impulsador Visitas Controladores
- Web Components Mapa Vistas
- API Config Env Esquema
- Web Types Visita
- API Tareas Servicios
- Web Components Seguimiento Tareas Vistas
- Web Components Usuarios Panel
- API Clientes Servicios
- Web Types Repositor
- API Common Paginacion
- API Empresas Admin Servicios
- API Package Json Package
- API Roles Servicios
- Web Tsconfig Json Tsconfig
- API Impulsador Acceso Operaciones Servicios
- API Impulsador Territorios Servicios
- API Plataforma Controladores
- Web Types Plataforma
- Web Components Clientes Vistas
- Infraestructura Package
- Web Components Iconos
- API Impulsador Programacion Visita
- API Impulsador KPIs Visitas Servicios
- API Repositor Controladores
- API Plataforma Acceso Servicios
- API Impulsador Zona DTO
- API Plataforma Asignaciones Servicios
- API Repositor Ruta Diaria Interfaces
- API Impulsador Visitas Servicios
- API Equipo Servicios
- API Repositor OSRM Servicios
- API Tsconfig Json Tsconfig
- API Impulsador Visitas Servicios
- Web Package Json Package
- API Impulsador Visita DTO
- API Notificaciones Servicios
- Web Components Toast Provider
- API Package Json Package
- API Auth Password
- API Locales Controladores
- API Plataforma Modulos Servicios
- API Impulsador Territorios Controladores
- API Impulsador Zonas Controladores
- API Locales Local DTO
- API Usuarios Admin Controladores
- API Usuarios Controladores
- Web Components Tablero
- API Auth Controladores
- API Impulsador Programacion Visita DTO
- Web Package Json Package
- API Equipo Controladores
- API Impulsador Zonas Servicios
- API Impulsador Fotos Servicios
- API Locales Tareas Local Servicios
- API Package Json Package
- API Locales Servicios
- API Locales Local Interfaces
- API Plataforma Ejecutable DTO
- API Common Transforms
- API Impulsador Novedad Pruebas
- API Plataforma Pagina DTO
- API Impulsador Territorio DTO
- API Usuarios Usuario DTO
- API Usuarios Servicios
- Web P?ginas
- API Plataforma Modulo DTO
- API Repositor Ruta Hoy Pruebas
- API Auth Servicios
- API Auth Register DTO
- API Locales Tarea Local DTO
- API Plataforma Ejecutables Servicios
- API Auth Datos Usuario
- API Locales Tareas Local Controladores
- Web Package Json Package
- API Base de Datos
- API Base de Datos
- API Health Controladores
- Web Components Mapa Picker
- API Base de Datos
- API Impulsador Visita Interfaces
- API Nest Cli Nest Cli
- API Base de Datos
- API Auth Login DTO
- Web Utils RUC
- API Base de Datos
- API Common Geo
- API Package Json Package
- API Package Json Package
- API Base de Datos
- API Base de Datos
- API Base de Datos
- Infraestructura Auto Deploy
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Package Json Package
- API Base de Datos
- API Base de Datos
- API Base de Datos
- Web Eslint Config Eslint Config
- Web Next Config Next Config
- Web Postcss Config Postcss Config
- Infraestructura Backup

## God Nodes (most connected - your core abstractions)
1. `RequestConUsuario` - 84 edges
2. `PrismaService` - 80 edges
3. `AccesoOperacionesCampoService` - 51 edges
4. `PaginacionDto` - 49 edges
5. `apiFetch()` - 44 edges
6. `RespuestaPaginada` - 38 edges
7. `rangoPaginacion()` - 36 edges
8. `formatoFechaHora()` - 29 edges
9. `JwtAuthGuard` - 24 edges
10. `VisitasService` - 24 edges

## Surprising Connections (you probably didn't know these)
- `ListaTareasGlobalesMovil()` --indirect_call--> `tarea()`  [INFERRED]
  apps/web/src/components/tareas/tareas-view.tsx → apps/api/src/impulsador/visitas.service.spec.ts
- `PanelLayout()` --calls--> `apiFetch()`  [EXTRACTED]
  apps/web/src/app/panel/layout.tsx → apps/web/src/lib/api.ts
- `ListaClientesMovil()` --calls--> `formatoFechaHora()`  [EXTRACTED]
  apps/web/src/components/clientes/clientes-view.tsx → apps/web/src/utils/fechas.ts
- `ListaEquipoMovil()` --calls--> `formatoFechaHora()`  [EXTRACTED]
  apps/web/src/components/equipo/equipo-view.tsx → apps/web/src/utils/fechas.ts
- `ListaClientesMovil()` --calls--> `formatoFechaHora()`  [EXTRACTED]
  apps/web/src/components/repositor/repositorio-clientes-view.tsx → apps/web/src/utils/fechas.ts

## Import Cycles
- None detected.

## Communities (142 total, 40 thin omitted)

### Community 0 - "API Impulsador Visitas Controladores"
Cohesion: 0.05
Nodes (46): RequestConUsuario, JwtAuthGuard, Injectable, SuperadminGuard, Injectable, MIME_POR_EXTENSION, tipoContenidoImagen(), MapaController (+38 more)

### Community 1 - "Web Components Mapa Vistas"
Cohesion: 0.05
Nodes (41): CAPAS_MAPA, CENTRO_DEFECTO, SeleccionMapa, useMapaOscuro(), VisibilidadCapas, cachePines, iconoDestino, iconoPin() (+33 more)

### Community 2 - "API Config Env Esquema"
Cohesion: 0.07
Nodes (42): ApiOkResponse, AppController, ApiTags, Controller, Get, AppModule, Module, AppService (+34 more)

### Community 3 - "Web Types Visita"
Cohesion: 0.07
Nodes (48): DIAS, EditorProgramacionVisita(), fechaHoy(), programacionInicial(), consultaFechas(), KpisVisitas(), ListaKpisMovil(), EstadoFoto (+40 more)

### Community 4 - "API Tareas Servicios"
Cohesion: 0.08
Nodes (30): ActualizarTareaGlobalDto, CrearTareaGlobalDto, ListarTareasGlobalesDto, PIPE, IsBoolean, IsInt, IsOptional, IsString (+22 more)

### Community 5 - "Web Components Seguimiento Tareas Vistas"
Cohesion: 0.07
Nodes (32): tarea(), EquipoView(), ListaEquipoMovil(), ListaEquipoMovilProps, FiltroEstado, FiltrosSeguimientoTareas, ListaSeguimientoTareasMovil(), RespuestaSeguimiento (+24 more)

### Community 6 - "Web Components Usuarios Panel"
Cohesion: 0.07
Nodes (26): Tab, EmpresasAbmPanel(), FORM_INICIAL, FormEmpresa, EmpresasPanel(), ModulosPanel(), FORM_INICIAL, FormRol (+18 more)

### Community 7 - "API Clientes Servicios"
Cohesion: 0.09
Nodes (27): ClientesController, ApiTags, Body, Controller, Delete, Get, Param, Patch (+19 more)

### Community 8 - "Web Types Repositor"
Cohesion: 0.09
Nodes (31): DetalleTareasProps, ResumenJornadaRepositor(), ContextoRutaDiaria, RutaDiariaProvider(), SolicitudRuta, useRutaDiaria(), AccionesParada(), AccionesParadaProps (+23 more)

### Community 9 - "API Common Paginacion"
Cohesion: 0.08
Nodes (26): PaginacionDto, rangoPaginacion(), RespuestaPaginada, IsInt, IsOptional, Max, Min, Type (+18 more)

### Community 10 - "API Empresas Admin Servicios"
Cohesion: 0.09
Nodes (27): AdminEmpresasController, ApiTags, Body, Controller, Delete, Param, Patch, Post (+19 more)

### Community 11 - "API Package Json Package"
Cohesion: 0.05
Nodes (37): author, description, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment (+29 more)

### Community 12 - "API Roles Servicios"
Cohesion: 0.09
Nodes (25): ActualizarRolDto, CrearRolDto, IsInt, IsOptional, IsString, Max, MaxLength, Min (+17 more)

### Community 13 - "Web Tsconfig Json Tsconfig"
Cohesion: 0.06
Nodes (34): exclude, extends, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx (+26 more)

### Community 14 - "API Impulsador Acceso Operaciones Servicios"
Cohesion: 0.12
Nodes (5): AccesoOperacionesCampoService, Injectable, UsuarioAsignableOperacionesDto, PrismaService, Injectable

### Community 15 - "API Impulsador Territorios Servicios"
Cohesion: 0.12
Nodes (16): LocalMapaDto, MapaDatosDto, TerritorioDto, aLocalMapaDto(), LocalParaMapa, MapaService, SELECT_LOCAL_MAPA, Injectable (+8 more)

### Community 16 - "API Plataforma Controladores"
Cohesion: 0.13
Nodes (12): AdminPlataformaController, MiPlataformaController, ApiTags, Body, Controller, Delete, Get, Param (+4 more)

### Community 17 - "Web Types Plataforma"
Cohesion: 0.11
Nodes (16): notificarPlataformaActualizada(), Empresa, EmpresaAdmin, AsignacionEmpresa, Conexion, Ejecutable, EmpresaModulo, Modulo (+8 more)

### Community 18 - "Web Components Clientes Vistas"
Cohesion: 0.11
Nodes (17): ClientesLocalesView(), Tab, ClientesView(), ClientesViewProps, FormCliente, INICIAL, ListaClientesMovil(), ListaClientesMovilProps (+9 more)

### Community 19 - "Infraestructura Package"
Cohesion: 0.07
Nodes (28): concurrently, devDependencies, concurrently, name, multer, postcss, overrides, @nestjs/platform-express (+20 more)

### Community 20 - "Web Components Iconos"
Cohesion: 0.11
Nodes (16): AdminPage(), PanelLayout(), DESCRIPCIONES_HERRAMIENTA, descripcionHerramienta(), PanelInicioPage(), BotonTema(), Modal(), PanelContext (+8 more)

### Community 21 - "API Impulsador Programacion Visita"
Cohesion: 0.18
Nodes (19): FrecuenciaProgramacionVisita, ProgramacionVisitaCalculo, ProgramacionVisitaDto, coincideFrecuencia(), compararFecha(), diaIso(), fechaEnZonaIso(), fechaLocalAUtc() (+11 more)

### Community 22 - "API Impulsador KPIs Visitas Servicios"
Cohesion: 0.17
Nodes (14): prisma, AgrupacionKpiVisitaDto, FiltroKpisVisitasDto, ListarKpisVisitasDto, IsEnum, IsOptional, Matches, KpiVisitasDetalleDto (+6 more)

### Community 23 - "API Repositor Controladores"
Cohesion: 0.15
Nodes (13): aProgramacionVisitaDto(), fechaSoloIso(), ListarTareasRepositorDto, ListarVisitasHoyDto, RepositorController, ApiTags, Controller, Get (+5 more)

### Community 24 - "API Plataforma Acceso Servicios"
Cohesion: 0.15
Nodes (8): AccesoPlataformaService, Injectable, AccesoModulos, ModuloMenu, UsuarioConAcceso, MiPlataformaService, Injectable, rolVe()

### Community 25 - "API Impulsador Zona DTO"
Cohesion: 0.17
Nodes (18): ActualizarZonaDto, CrearZonaDto, ListarZonasDto, PIPE, ArrayMaxSize, IsArray, IsBoolean, IsInt (+10 more)

### Community 26 - "API Plataforma Asignaciones Servicios"
Cohesion: 0.13
Nodes (16): AsignacionesService, Injectable, AsignarModuloDto, PaginaAsignadaDto, ArrayMaxSize, ArrayUnique, IsArray, IsBoolean (+8 more)

### Community 27 - "API Repositor Ruta Diaria Interfaces"
Cohesion: 0.19
Nodes (14): AgendaDiaria, CandidataAgendaDiaria, ClienteRepositorDto, EstadoParadaRuta, FuenteRuta, ParadaRutaDto, RutaDiariaDto, VisitaHoyDto (+6 more)

### Community 28 - "API Impulsador Visitas Servicios"
Cohesion: 0.15
Nodes (16): redondear1Decimal(), VisitaDto, VisitaResumenDto, duracionVisitaMinutos(), aVisitaDto(), aVisitaEquipoLocalDto(), aVisitaResumenDto(), exigirDentroDelRadio() (+8 more)

### Community 29 - "API Equipo Servicios"
Cohesion: 0.15
Nodes (14): EstadoTareaEquipoDto, ListarTareasEquipoDto, IsEnum, IsInt, Max, Min, Type, EquipoService (+6 more)

### Community 30 - "API Repositor OSRM Servicios"
Cohesion: 0.19
Nodes (13): CoordenadaRuta, MatrizRuta, OsrmRouteResponse, OsrmTableResponse, ResultadoGeometriaRuta, ParadaOptimizada, ParadaParaOptimizar, OsrmService (+5 more)

### Community 31 - "API Tsconfig Json Tsconfig"
Cohesion: 0.09
Nodes (21): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+13 more)

### Community 32 - "API Impulsador Visitas Servicios"
Cohesion: 0.26
Nodes (6): UsuarioOperacionesCampo, VisitaTareaDto, aVisitaTareaDto(), tareaDeVisita(), Injectable, VisitasService

### Community 33 - "Web Package Json Package"
Cohesion: 0.10
Nodes (20): libphonenumber-js, libphonenumber-js, dependencies, flag-icons, leaflet, libphonenumber-js, motion, next (+12 more)

### Community 34 - "API Impulsador Visita DTO"
Cohesion: 0.18
Nodes (17): ActualizarVisitaTareaDto, FinalizarVisitaDto, IniciarVisitaDto, ListarVisitasDto, ListarVisitasEquipoDto, METADATA, PIPE, IsBoolean (+9 more)

### Community 35 - "API Notificaciones Servicios"
Cohesion: 0.17
Nodes (9): ListarNotificacionesDto, NotificacionTareaDto, NotificacionLeidaDto, NotificacionSeleccionada, NotificacionesNoLeidasDto, NotificacionesService, SELECT_NOTIFICACION, Injectable (+1 more)

### Community 36 - "Web Components Toast Provider"
Cohesion: 0.15
Nodes (13): manrope, metadata, viewport, ActualizadorDespliegue(), deploymentIdDelHtml(), obtenerDeploymentId(), ContextoToast, estilos (+5 more)

### Community 37 - "API Package Json Package"
Cohesion: 0.11
Nodes (19): dependencies, class-transformer, compression, cookie-parser, @nestjs/common, @nestjs/core, pg, @prisma/client (+11 more)

### Community 38 - "API Auth Password"
Cohesion: 0.19
Nodes (10): MENSAJES_DUPLICADO, TokenPayload, hashPassword(), scrypt, verifyPassword(), puedeAdministrarUsuarios(), MetaUsuariosDto, ContextoAdmin (+2 more)

### Community 39 - "API Locales Controladores"
Cohesion: 0.17
Nodes (12): LocalesController, ApiTags, Body, Controller, Delete, Get, Param, Patch (+4 more)

### Community 40 - "API Plataforma Modulos Servicios"
Cohesion: 0.23
Nodes (5): ModuloDto, PaginaDto, PaginaMenu, ModulosService, Injectable

### Community 41 - "API Impulsador Territorios Controladores"
Cohesion: 0.16
Nodes (12): TerritoriosController, ApiTags, Body, Controller, Delete, Get, Param, Patch (+4 more)

### Community 42 - "API Impulsador Zonas Controladores"
Cohesion: 0.16
Nodes (12): ApiTags, Body, Controller, Delete, Get, Param, Patch, Post (+4 more)

### Community 43 - "API Locales Local DTO"
Cohesion: 0.27
Nodes (16): ActualizarLocalDto, CrearLocalDto, ListarLocalesDto, ListarUsuariosAsignablesDto, IsBoolean, IsInt, IsNumber, IsOptional (+8 more)

### Community 44 - "API Usuarios Admin Controladores"
Cohesion: 0.16
Nodes (12): AdminUsuariosController, ApiTags, Body, Controller, Delete, Get, Param, Patch (+4 more)

### Community 45 - "API Usuarios Controladores"
Cohesion: 0.16
Nodes (12): ApiTags, Body, Controller, Delete, Get, Param, Patch, Post (+4 more)

### Community 46 - "Web Components Tablero"
Cohesion: 0.12
Nodes (9): aparecer, CHIPS, KPIS, PropsTooltip, Tablero(), TENDENCIA_VENTAS, VENTAS_MENSUALES, VENTAS_POR_CATEGORIA (+1 more)

### Community 47 - "API Auth Controladores"
Cohesion: 0.16
Nodes (12): AuthController, ApiOperation, ApiTags, Body, Controller, Get, Post, Req (+4 more)

### Community 48 - "API Impulsador Programacion Visita DTO"
Cohesion: 0.12
Nodes (16): FrecuenciaVisitaDto, GuardarProgramacionVisitaDto, ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt (+8 more)

### Community 49 - "Web Package Json Package"
Cohesion: 0.12
Nodes (16): @types/node, @types/node, devDependencies, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/leaflet, @types/node (+8 more)

### Community 50 - "API Equipo Controladores"
Cohesion: 0.17
Nodes (12): ListarRepositoresEquipoDto, IsOptional, IsString, MaxLength, Transform, EquipoController, ApiTags, Controller (+4 more)

### Community 51 - "API Impulsador Zonas Servicios"
Cohesion: 0.25
Nodes (5): ZonaDto, aZonaDto(), Injectable, ZonasService, ListaUsuariosMovil()

### Community 52 - "API Impulsador Fotos Servicios"
Cohesion: 0.14
Nodes (7): EXTENSION_POR_MIMETYPE, FotosService, Injectable, FOTO_MIMETYPES, MODULOS_OPERACION_CAMPO, PAGINAS_REPOSITOR, FECHA_INICIO

### Community 53 - "API Locales Tareas Local Servicios"
Cohesion: 0.38
Nodes (4): TareaLocalDto, aTareaLocalDto(), TareasLocalService, Injectable

### Community 54 - "API Package Json Package"
Cohesion: 0.13
Nodes (15): devDependencies, eslint-config-prettier, @eslint/eslintrc, @nestjs/cli, supertest, tsconfig-paths, @types/express, @types/multer (+7 more)

### Community 55 - "API Locales Servicios"
Cohesion: 0.33
Nodes (3): aLocalDto(), LocalesService, Injectable

### Community 56 - "API Locales Local Interfaces"
Cohesion: 0.23
Nodes (8): filtrosBusquedaUsuario(), LocalDetalleDto, LocalDto, UsuarioAsignable, LocalConRelaciones, SELECT_LOCAL, SELECT_TAREA_LOCAL, TareaLocalFila

### Community 57 - "API Plataforma Ejecutable DTO"
Cohesion: 0.26
Nodes (11): ActualizarEjecutableDto, CrearEjecutableDto, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length (+3 more)

### Community 59 - "API Impulsador Novedad Pruebas"
Cohesion: 0.15
Nodes (12): ParametrosNovedadTareaDto, ReportarNovedadTareaDto, METADATA, METADATA_PARAMETROS, PIPE, IsInt, IsString, Length (+4 more)

### Community 60 - "API Plataforma Pagina DTO"
Cohesion: 0.33
Nodes (11): ActualizarPaginaDto, CrearPaginaDto, IsBoolean, IsInt, IsOptional, IsString, Length, Matches (+3 more)

### Community 61 - "API Impulsador Territorio DTO"
Cohesion: 0.29
Nodes (12): ActualizarTerritorioDto, CrearTerritorioDto, IsArray, IsBoolean, IsInt, IsOptional, IsString, Length (+4 more)

### Community 62 - "API Usuarios Usuario DTO"
Cohesion: 0.26
Nodes (12): ActualizarUsuarioDto, CrearUsuarioDto, ListarUsuariosDto, IsBoolean, IsInt, IsOptional, IsString, Max (+4 more)

### Community 63 - "API Usuarios Servicios"
Cohesion: 0.36
Nodes (4): UsuarioAdminDto, aUsuarioDto(), Injectable, UsuariosService

### Community 64 - "Web P?ginas"
Cohesion: 0.30
Nodes (11): enteroPositivo(), filtroRepositor(), filtrosTareas(), PaginaModulo(), textoConsulta(), valorConsulta(), VISTAS, MapaView() (+3 more)

### Community 65 - "API Plataforma Modulo DTO"
Cohesion: 0.33
Nodes (11): ActualizarModuloDto, CrearModuloDto, IsBoolean, IsInt, IsOptional, IsString, Length, Matches (+3 more)

### Community 66 - "API Repositor Ruta Hoy Pruebas"
Cohesion: 0.20
Nodes (9): RutaHoyDto, METADATA, PIPE, IsNumber, IsOptional, Max, Min, Type (+1 more)

### Community 67 - "API Auth Servicios"
Cohesion: 0.36
Nodes (3): AuthService, Injectable, UsuarioSesion

### Community 68 - "API Auth Register DTO"
Cohesion: 0.20
Nodes (10): RegisterDto, IsInt, IsString, Length, Matches, MaxLength, MinLength, Transform (+2 more)

### Community 69 - "API Locales Tarea Local DTO"
Cohesion: 0.36
Nodes (10): ActualizarTareaLocalDto, CrearTareaLocalDto, IsBoolean, IsInt, IsOptional, IsString, Length, Max (+2 more)

### Community 70 - "API Plataforma Ejecutables Servicios"
Cohesion: 0.38
Nodes (3): EjecutablesService, Injectable, EjecutableDto

### Community 71 - "API Auth Datos Usuario"
Cohesion: 0.47
Nodes (6): normalizarCelular(), normalizarRucUsuario(), TIPOS_CELULAR_VALIDOS, calcularDvRucPy(), esRucParaguayoValido(), normalizarRucPy()

### Community 72 - "API Locales Tareas Local Controladores"
Cohesion: 0.22
Nodes (7): TareasLocalController, ApiTags, Controller, Get, Param, Req, UseGuards

### Community 73 - "Web Package Json Package"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 74 - "API Base de Datos"
Cohesion: 0.46
Nodes (7): "config_impulsador", "locales", "tareas_local", "territorios", "visita_tareas", "visitas", "zonas"

### Community 75 - "API Base de Datos"
Cohesion: 0.32
Nodes (7): "clientes", "config_impulsador", "locales", "tareas_cliente", "tareas_local", "territorios", "zona_usuarios"

### Community 76 - "API Health Controladores"
Cohesion: 0.25
Nodes (6): HealthController, ApiOperation, ApiTags, Controller, Get, HealthCheck

### Community 77 - "Web Components Mapa Picker"
Cohesion: 0.29
Nodes (5): CAPAS_MAPA, CENTRO_DEFECTO, iconoPin, MapaPicker(), useMapaOscuro()

### Community 78 - "API Base de Datos"
Cohesion: 0.48
Nodes (6): "ejecutables", "empresa_modulos", "empresa_paginas", "modulos", "paginas", "usuarios"

### Community 79 - "API Impulsador Visita Interfaces"
Cohesion: 0.33
Nodes (4): NovedadVisitaTareaDto, VisitaEquipoLocalDto, VisitaEquipoUltimaVisitaDto, validarZonaHoraria()

### Community 80 - "API Nest Cli Nest Cli"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 81 - "API Base de Datos"
Cohesion: 0.60
Nodes (4): "conexiones", "empresas", "roles", "usuarios"

### Community 82 - "API Auth Login DTO"
Cohesion: 0.40
Nodes (5): LoginDto, IsString, Length, MaxLength, Transform

### Community 83 - "Web Utils RUC"
Cohesion: 0.80
Nodes (4): calcularDvRucPy(), esRucParaguayoValido(), normalizarRucPy(), pistaRucPy()

### Community 84 - "API Base de Datos"
Cohesion: 0.50
Nodes (3): "empresa_modulos", "empresa_paginas", "locales"

### Community 86 - "API Package Json Package"
Cohesion: 0.67
Nodes (3): eslint, eslint, eslint

### Community 87 - "API Package Json Package"
Cohesion: 0.67
Nodes (3): typescript, typescript, typescript

## Knowledge Gaps
- **314 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+309 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `API Package Json Package` to `API Package Json Package`, `Web Package Json Package`, `API Package Json Package`, `API Package Json Package`, `API Package Json Package`, `API Package Json Package`, `API Package Json Package`, `API Package Json Package`, `API Package Json Package`, `API Impulsador KPIs Visitas Servicios`, `API Package Json Package`, `API Package Json Package`, `API Package Json Package`, `API Package Json Package`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Why does `prisma` connect `API Impulsador KPIs Visitas Servicios` to `API Package Json Package`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `apiFetch()` connect `Web Components Usuarios Panel` to `Web P?ginas`, `Web Components Mapa Vistas`, `Web Types Visita`, `Web Components Seguimiento Tareas Vistas`, `Web Types Repositor`, `Web Types Plataforma`, `Web Components Clientes Vistas`, `Web Components Iconos`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _314 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Impulsador Visitas Controladores` be split into smaller, more focused modules?**
  _Cohesion score 0.05201465201465202 - nodes in this community are weakly interconnected._
- **Should `Web Components Mapa Vistas` be split into smaller, more focused modules?**
  _Cohesion score 0.052429667519181586 - nodes in this community are weakly interconnected._
- **Should `API Config Env Esquema` be split into smaller, more focused modules?**
  _Cohesion score 0.0697980684811238 - nodes in this community are weakly interconnected._