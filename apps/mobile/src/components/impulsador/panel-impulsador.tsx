/* Hallmark · Workbench amable · C4 navegación inferior segura. */
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  actualizarTareaVisita,
  obtenerAgendaHoy,
  obtenerMarcaciones,
  obtenerRendimiento,
  obtenerVisita,
  subirFotoPresencia,
  subirFotoTarea,
} from "../../lib/api";
import {
  cantidadMarcacionesPendientes,
  guardarEntradaPendiente,
  guardarSalidaPendiente,
  sincronizarMarcacionesPendientes,
} from "../../lib/cola-marcaciones";
import {
  detenerGeocercas,
  obtenerAgendaGuardada,
  sincronizarGeocercas,
} from "../../lib/proximidad";
import type { SesionMovil } from "../../lib/sesion";
import type {
  MarcacionResumen,
  RendimientoImpulsador,
  RespuestaPaginada,
  TareaVisita,
  Visita,
  VisitaHoy,
} from "../../types/impulsador";
import {
  anchoMaximoContenido,
  colores,
  espacios,
  fuentes,
  radios,
} from "../../tema";
import {
  EntradaView,
  HomeView,
  MarcacionesView,
  VisitaActiva,
} from "./vistas";
import { leerUbicacion, mensajeError } from "./utils";

type Seccion = "home" | "entrada" | "marcaciones";
type IconoNavegacion = keyof typeof Ionicons.glyphMap;

const SECCIONES: { id: Seccion; etiqueta: string; icono: IconoNavegacion; iconoActivo: IconoNavegacion }[] = [
  { id: "home", etiqueta: "Home", icono: "home-outline", iconoActivo: "home" },
  { id: "entrada", etiqueta: "Entrada", icono: "location-outline", iconoActivo: "location" },
  { id: "marcaciones", etiqueta: "Marcaciones", icono: "receipt-outline", iconoActivo: "receipt" },
];

const PAGINACION_INICIAL: RespuestaPaginada<MarcacionResumen> = {
  items: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
};

export function PanelImpulsador({
  sesion,
  enLinea,
  alCerrar,
}: {
  sesion: SesionMovil;
  enLinea: boolean | null;
  alCerrar: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [seccion, setSeccion] = useState<Seccion>("home");
  const [agenda, setAgenda] = useState<VisitaHoy[]>([]);
  const [visitaActiva, setVisitaActiva] = useState<Visita | null>(null);
  const [entradaClave, setEntradaClave] = useState<string | null>(null);
  const [paginaMarcaciones, setPaginaMarcaciones] =
    useState<RespuestaPaginada<MarcacionResumen>>(PAGINACION_INICIAL);
  const [fechaMarcaciones, setFechaMarcaciones] = useState<string | null>(null);
  const [rendimiento, setRendimiento] = useState<RendimientoImpulsador | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const [proximidadActiva, setProximidadActiva] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [cargandoMarcaciones, setCargandoMarcaciones] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarAgenda = useCallback(async () => {
    try {
      const respuesta = await obtenerAgendaHoy(sesion.token);
      setAgenda(respuesta.items);
      const abierta = respuesta.items.find(({ visitaAbiertaId }) => visitaAbiertaId);
      if (abierta?.visitaAbiertaId) {
        const visita = await obtenerVisita(sesion.token, abierta.visitaAbiertaId);
        setVisitaActiva(visita);
        setEntradaClave(`visita:${visita.id}`);
      } else {
        setVisitaActiva(null);
        setEntradaClave(null);
      }
      const activa = await sincronizarGeocercas(sesion, respuesta.items, true).catch(() => false);
      setProximidadActiva(activa);
      return respuesta.items;
    } catch {
      const guardada = await obtenerAgendaGuardada(sesion.usuario.id);
      setAgenda(guardada);
      const activa = await sincronizarGeocercas(sesion, guardada, true).catch(() => false);
      setProximidadActiva(activa);
      return guardada;
    }
  }, [sesion]);

  const cargarMarcaciones = useCallback(async (pagina: number, fecha: string | null) => {
    setCargandoMarcaciones(true);
    try {
      const respuesta = await obtenerMarcaciones(sesion.token, { page: pagina, fecha });
      setPaginaMarcaciones(respuesta);
    } finally {
      setCargandoMarcaciones(false);
    }
  }, [sesion.token]);

  const cargarTodo = useCallback(async (pagina = 1, fecha: string | null = null) => {
    const [agendaNueva, totalPendientes] = await Promise.all([
      cargarAgenda(),
      cantidadMarcacionesPendientes(),
    ]);
    setPendientes(totalPendientes);
    const [, metricas] = await Promise.allSettled([
      cargarMarcaciones(pagina, fecha),
      obtenerRendimiento(sesion.token),
    ]);
    if (metricas.status === "fulfilled") setRendimiento(metricas.value);
    return agendaNueva;
  }, [cargarAgenda, cargarMarcaciones, sesion.token]);

  const sincronizar = useCallback(async () => {
    const resultado = await sincronizarMarcacionesPendientes();
    setPendientes(resultado.pendientes);
    if (resultado.ultimaVisita) {
      setVisitaActiva(resultado.ultimaVisita.completadaEn ? null : resultado.ultimaVisita);
    }
    if (resultado.enviadas > 0) {
      await cargarTodo(paginaMarcaciones.page, fechaMarcaciones);
      setMensaje(`${resultado.enviadas} marcación${resultado.enviadas === 1 ? "" : "es"} enviada${resultado.enviadas === 1 ? "" : "s"}.`);
    }
  }, [cargarTodo, fechaMarcaciones, paginaMarcaciones.page]);

  useEffect(() => {
    let montado = true;
    void cargarTodo(1, null)
      .catch((causa) => montado && setError(mensajeError(causa)))
      .finally(() => montado && setCargando(false));
    return () => {
      montado = false;
    };
  }, [cargarTodo]);

  useEffect(() => {
    if (enLinea) void sincronizar().catch(() => undefined);
  }, [enLinea, sincronizar]);

  useEffect(() => {
    const suscripcionApp = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void sincronizar().catch(() => undefined);
    });
    const suscripcionNotificacion = Notifications.addNotificationResponseReceivedListener(() => {
      setSeccion("entrada");
    });
    return () => {
      suscripcionApp.remove();
      suscripcionNotificacion.remove();
    };
  }, [sincronizar]);

  async function refrescar() {
    setRefrescando(true);
    setError(null);
    try {
      if (enLinea) await sincronizar();
      await cargarTodo(paginaMarcaciones.page, fechaMarcaciones);
    } catch (causa) {
      setError(mensajeError(causa));
    } finally {
      setRefrescando(false);
    }
  }

  async function marcarEntrada(local: VisitaHoy["local"]) {
    setProcesando(true);
    setError(null);
    setMensaje(null);
    try {
      const ubicacion = await leerUbicacion(sesion.usuario.id, "ENTRADA");
      await guardarEntradaPendiente(sesion.usuario.id, local.id, ubicacion);
      setEntradaClave(ubicacion.claveMovil);
      const resultado = await sincronizarMarcacionesPendientes();
      setPendientes(resultado.pendientes);
      if (resultado.ultimaVisita) {
        setVisitaActiva(resultado.ultimaVisita);
        setMensaje(`Entrada confirmada en ${local.nombre}.`);
        await cargarAgenda();
      } else {
        setMensaje("Entrada guardada en este teléfono. La enviaremos cuando vuelva internet.");
      }
      if (resultado.ultimoError && enLinea) setError(resultado.ultimoError);
    } catch (causa) {
      setPendientes(await cantidadMarcacionesPendientes());
      setError(mensajeError(causa));
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarTarea(tarea: TareaVisita) {
    if (!visitaActiva) return;
    setProcesando(true);
    setError(null);
    try {
      const actualizada = await actualizarTareaVisita(sesion.token, visitaActiva.id, tarea, !tarea.completada);
      setVisitaActiva((anterior) =>
        anterior
          ? {
              ...anterior,
              tareas: (anterior.tareas ?? []).map((item) =>
                item.id === actualizada.id ? actualizada : item,
              ),
            }
          : anterior,
      );
    } catch (causa) {
      setError(mensajeError(causa));
    } finally {
      setProcesando(false);
    }
  }

  async function tomarFoto(tarea?: TareaVisita) {
    if (!visitaActiva) return;
    setProcesando(true);
    setError(null);
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) throw new Error("Permití la cámara para adjuntar la evidencia.");
      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });
      if (resultado.canceled || !resultado.assets[0]) return;
      if (tarea) {
        const actualizada = await subirFotoTarea(
          sesion.token,
          visitaActiva.id,
          tarea.id,
          resultado.assets[0].uri,
        );
        setVisitaActiva((anterior) =>
          anterior
            ? {
                ...anterior,
                tareas: (anterior.tareas ?? []).map((item) =>
                  item.id === actualizada.id ? actualizada : item,
                ),
              }
            : anterior,
        );
      } else {
        const actualizada = await subirFotoPresencia(
          sesion.token,
          visitaActiva.id,
          resultado.assets[0].uri,
        );
        setVisitaActiva(actualizada);
      }
      setMensaje("Evidencia guardada.");
    } catch (causa) {
      setError(mensajeError(causa));
    } finally {
      setProcesando(false);
    }
  }

  async function marcarSalida() {
    if (!visitaActiva) return;
    const tareasActivas = visitaActiva.tareas ?? [];
    const incompletas = tareasActivas.filter(
      (tarea) => tarea.activa && !tarea.completada && !tarea.novedad,
    );
    if (incompletas.length > 0) {
      setError(`Completá ${incompletas.length} tarea${incompletas.length === 1 ? "" : "s"} antes de marcar la salida.`);
      return;
    }
    if (tareasActivas.some((tarea) => tarea.activa && tarea.completada && tarea.requiereFoto && !tarea.foto)) {
      setError("Falta una foto requerida en las tareas completadas.");
      return;
    }
    if (visitaActiva.requiereFotoPresencia && !visitaActiva.fotoPresencia) {
      setError("Tomá la foto de presencia antes de marcar la salida.");
      return;
    }
    setProcesando(true);
    setError(null);
    try {
      const ubicacion = await leerUbicacion(sesion.usuario.id, "SALIDA");
      await guardarSalidaPendiente(
        sesion.usuario.id,
        visitaActiva.localId,
        ubicacion,
        entradaClave ?? `visita:${visitaActiva.id}`,
        visitaActiva.id,
      );
      const resultado = await sincronizarMarcacionesPendientes();
      setPendientes(resultado.pendientes);
      if (resultado.ultimaVisita?.completadaEn) {
        setVisitaActiva(null);
        setEntradaClave(null);
        setMensaje("Salida confirmada. Tu visita quedó registrada.");
        await cargarTodo(paginaMarcaciones.page, fechaMarcaciones);
      } else {
        setMensaje("Salida guardada en el teléfono para sincronizarla luego.");
      }
      if (resultado.ultimoError && enLinea) setError(resultado.ultimoError);
    } catch (causa) {
      setPendientes(await cantidadMarcacionesPendientes());
      setError(mensajeError(causa));
    } finally {
      setProcesando(false);
    }
  }

  async function cerrar() {
    setProcesando(true);
    try {
      await detenerGeocercas();
      await alCerrar();
    } finally {
      setProcesando(false);
    }
  }

  function cambiarFechaMarcaciones(fecha: string | null) {
    setFechaMarcaciones(fecha);
    setError(null);
    void cargarMarcaciones(1, fecha).catch((causa) => setError(mensajeError(causa)));
  }

  function cambiarPaginaMarcaciones(pagina: number) {
    setError(null);
    void cargarMarcaciones(pagina, fechaMarcaciones).catch((causa) => setError(mensajeError(causa)));
  }

  const enHome = seccion === "home";
  const estadoConexion = `${enLinea ? "Con internet" : "Sin señal · guardado local activo"}${
    pendientes > 0 ? ` · ${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : ""
  }`;
  const contenido =
    seccion === "home" ? (
      <HomeView agenda={agenda} datos={rendimiento} nombre={sesion.usuario.nombre} />
    ) : seccion === "entrada" ? (
      visitaActiva ? (
        <VisitaActiva visita={visitaActiva} procesando={procesando} alCambiarTarea={cambiarTarea} alTomarFoto={tomarFoto} alSalir={marcarSalida} />
      ) : (
        <EntradaView agenda={agenda} procesando={procesando} proximidadActiva={proximidadActiva} alMarcar={marcarEntrada} />
      )
    ) : seccion === "marcaciones" ? (
      <MarcacionesView
        alCambiarFecha={cambiarFechaMarcaciones}
        alCambiarPagina={cambiarPaginaMarcaciones}
        cargando={cargandoMarcaciones}
        fecha={fechaMarcaciones}
        items={paginaMarcaciones.items}
        pagina={paginaMarcaciones}
        pendientes={pendientes}
      />
    ) : (
      null
    );

  return (
    <View style={styles.pantalla}>
      <View style={[styles.cabecera, enHome && styles.cabeceraHome, { paddingTop: Math.max(insets.top, espacios.sm) + espacios.xs, paddingHorizontal: width < 360 ? espacios.md : espacios.xl }]}>
        <View style={styles.cabeceraTexto}>
          {enHome ? (
            <Text style={[styles.estadoConexion, styles.estadoConexionHome]}>{estadoConexion}</Text>
          ) : (
            <>
              <Text style={styles.marca}>COMERCIA CAMPO</Text>
              <Text numberOfLines={1} style={styles.saludo}>Hola, {sesion.usuario.nombre}</Text>
              <Text style={styles.estadoConexion}>{estadoConexion}</Text>
            </>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void cerrar()}
          disabled={procesando}
          style={({ pressed }) => [styles.botonSalirCuenta, pressed && styles.presionado]}
        >
          <Text style={styles.botonSalirCuentaTexto}>Salir</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.contenido, { paddingHorizontal: width < 360 ? espacios.md : espacios.xl, paddingBottom: Math.max(insets.bottom, espacios.sm) + 104 }]}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={() => void refrescar()} tintColor={colores.primario} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.columna, { maxWidth: anchoMaximoContenido }]}>
          {cargando ? (
            <View style={styles.cargando}>
              <ActivityIndicator color={colores.primario} size="large" />
              <Text style={styles.textoSecundario}>Preparando tu jornada…</Text>
            </View>
          ) : contenido}
          {mensaje ? <View style={styles.mensaje} accessibilityLiveRegion="polite"><Text style={styles.mensajeTexto}>{mensaje}</Text></View> : null}
          {error ? <View style={styles.error} accessibilityLiveRegion="assertive"><Text style={styles.errorTitulo}>Revisemos esto</Text><Text style={styles.errorTexto}>{error}</Text></View> : null}
        </View>
      </ScrollView>

      <View style={[styles.navegacion, { paddingBottom: Math.max(insets.bottom, espacios.xs), paddingHorizontal: width < 360 ? espacios.xs : espacios.sm }]}>
        {SECCIONES.map((item) => {
          const activa = seccion === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              onPress={() => setSeccion(item.id)}
              style={({ pressed }) => [styles.tab, activa && styles.tabActivo, pressed && styles.presionado]}
            >
              <View style={[styles.indicadorTab, activa && styles.indicadorTabActivo]} />
              <Ionicons
                color={activa ? colores.primario : colores.textoSecundario}
                name={activa ? item.iconoActivo : item.icono}
                size={21}
              />
              <Text numberOfLines={1} style={[styles.tabTexto, activa && styles.tabTextoActivo]}>{item.etiqueta}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { backgroundColor: colores.fondo, flex: 1 },
  cabecera: { alignItems: "center", backgroundColor: colores.fondoElevado, flexDirection: "row", gap: espacios.md, paddingBottom: espacios.lg },
  cabeceraHome: { paddingBottom: espacios.md },
  cabeceraTexto: { flex: 1, minWidth: 0 },
  marca: { color: colores.acento, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  saludo: { color: colores.textoSobreOscuro, fontFamily: fuentes.titulos, fontSize: 22, fontWeight: "800", lineHeight: 28, marginTop: espacios.xxs },
  estadoConexion: { color: colores.textoSobreOscuroSecundario, fontSize: 12, lineHeight: 17, marginTop: espacios.xxs },
  estadoConexionHome: { fontSize: 13, fontWeight: "700", marginTop: 0 },
  botonSalirCuenta: { alignItems: "center", borderColor: colores.bordeSobreOscuro, borderRadius: radios.redondo, borderWidth: 1, justifyContent: "center", minHeight: 44, minWidth: 54, paddingHorizontal: espacios.sm },
  botonSalirCuentaTexto: { color: colores.textoSobreOscuro, fontSize: 13, fontWeight: "700" },
  contenido: { flexGrow: 1, paddingTop: espacios.xl },
  columna: { alignSelf: "center", gap: espacios.md, width: "100%" },
  cargando: { alignItems: "center", gap: espacios.md, justifyContent: "center", minHeight: 260 },
  textoSecundario: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  mensaje: { backgroundColor: colores.tarjetaSuave, borderRadius: radios.medio, padding: espacios.md },
  mensajeTexto: { color: colores.textoAviso, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  error: { backgroundColor: colores.errorFondo, borderRadius: radios.medio, gap: espacios.xxs, padding: espacios.md },
  errorTitulo: { color: colores.errorTexto, fontSize: 14, fontWeight: "900" },
  errorTexto: { color: colores.errorTexto, fontSize: 13, lineHeight: 19 },
  navegacion: { backgroundColor: colores.tarjeta, borderTopColor: colores.borde, borderTopWidth: 1, bottom: 0, flexDirection: "row", gap: espacios.xxs, left: 0, paddingTop: espacios.xs, position: "absolute", right: 0 },
  tab: { alignItems: "center", borderRadius: radios.medio, flex: 1, gap: 2, justifyContent: "center", minHeight: 62, minWidth: 0, paddingHorizontal: espacios.xxs, position: "relative" },
  tabActivo: { backgroundColor: colores.tarjetaSuave },
  indicadorTab: { backgroundColor: "transparent", borderRadius: 2, height: 3, marginBottom: espacios.xxs, width: 18 },
  indicadorTabActivo: { backgroundColor: colores.primario },
  tabTexto: { color: colores.textoSecundario, fontSize: 10, fontWeight: "700", lineHeight: 13 },
  tabTextoActivo: { color: colores.primario, fontWeight: "900" },
  presionado: { opacity: 0.78, transform: [{ translateY: 1 }] },
});
