/* Hallmark · Workbench amable · C4 navegación inferior segura. */
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { BackdropProceso } from "../../components/backdrop-proceso";
import { ToastMovil } from "../../components/toast-movil";
import {
  obtenerAgendaHoy,
  obtenerMarcaciones,
  obtenerVisitaAbierta,
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
  tienePermisosProximidad,
} from "../../lib/proximidad";
import type { SesionMovil } from "../../lib/sesion";
import type {
  MarcacionResumen,
  RespuestaPaginada,
  Visita,
  VisitaHoy,
} from "../../types/impulsador";
import type { TipoToastMovil, ToastMovilItem } from "../../types/toast";
import {
  anchoMaximoContenido,
  colores,
  espacios,
  fuentes,
  radios,
} from "../../tema";
import {
  EntradaView,
  MarcacionesView,
  VisitaActiva,
} from "./vistas";
import { leerUbicacion, mensajeError } from "./utils";
import { esJornadaDeDiaAnterior, formatoFechaHoraCorta } from "../../utils/fecha";

type Seccion = "entrada" | "marcaciones";
type IconoNavegacion = keyof typeof Ionicons.glyphMap;

const SECCIONES: { id: Seccion; etiqueta: string; icono: IconoNavegacion; iconoActivo: IconoNavegacion }[] = [
  { id: "entrada", etiqueta: "Jornada", icono: "location-outline", iconoActivo: "location" },
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
  const [seccion, setSeccion] = useState<Seccion>("entrada");
  const [agenda, setAgenda] = useState<VisitaHoy[]>([]);
  const [visitaActiva, setVisitaActiva] = useState<Visita | null>(null);
  const [entradaClave, setEntradaClave] = useState<string | null>(null);
  const [paginaMarcaciones, setPaginaMarcaciones] =
    useState<RespuestaPaginada<MarcacionResumen>>(PAGINACION_INICIAL);
  const [fechaMarcaciones, setFechaMarcaciones] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const [proximidadActiva, setProximidadActiva] = useState(false);
  const [faltanPermisosProximidad, setFaltanPermisosProximidad] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensajeProceso, setMensajeProceso] = useState<string | null>(null);
  const [cargandoMarcaciones, setCargandoMarcaciones] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [toast, setToast] = useState<ToastMovilItem | null>(null);
  const [ultimoCierreLocalId, setUltimoCierreLocalId] = useState<number | null>(null);
  const siguienteToastId = useRef(0);

  const mostrarToast = useCallback(
    (tipo: TipoToastMovil, titulo: string, detalle?: string) => {
      siguienteToastId.current += 1;
      setToast({ id: siguienteToastId.current, tipo, titulo, detalle });
    },
    [],
  );
  const cerrarToast = useCallback(() => setToast(null), []);

  const actualizarProximidad = useCallback(
    async (visitas: VisitaHoy[]) => {
      const activa = await sincronizarGeocercas(sesion, visitas, true).catch(
        () => false,
      );
      const permisosOtorgados = await tienePermisosProximidad().catch(
        () => null,
      );
      setProximidadActiva(activa);
      setFaltanPermisosProximidad(permisosOtorgados === false);
    },
    [sesion],
  );

  const cargarAgenda = useCallback(async () => {
    try {
      const respuesta = await obtenerAgendaHoy(sesion.token);
      const visitaAbierta = await obtenerVisitaAbierta(sesion.token).catch(
        () => undefined,
      );
      setAgenda(respuesta.items);
      if (visitaAbierta !== undefined) {
        if (visitaAbierta) {
          setVisitaActiva(visitaAbierta);
          setEntradaClave(`visita:${visitaAbierta.id}`);
        } else {
          setVisitaActiva(null);
          setEntradaClave(null);
        }
      }
      await actualizarProximidad(respuesta.items);
      return respuesta.items;
    } catch {
      const guardada = await obtenerAgendaGuardada(sesion.usuario.id);
      setAgenda(guardada);
      await actualizarProximidad(guardada);
      return guardada;
    }
  }, [actualizarProximidad, sesion]);

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
    await cargarMarcaciones(pagina, fecha);
    return agendaNueva;
  }, [cargarAgenda, cargarMarcaciones, sesion.token]);

  const sincronizar = useCallback(async () => {
    const resultado = await sincronizarMarcacionesPendientes();
    setPendientes(resultado.pendientes);
    if (resultado.ultimaVisita) {
      setVisitaActiva(resultado.ultimaVisita.completadaEn ? null : resultado.ultimaVisita);
    }
    if (resultado.enviadas > 0 || resultado.depuradas > 0) {
      await cargarTodo(paginaMarcaciones.page, fechaMarcaciones);
      mostrarToast(
        "exito",
        resultado.enviadas > 0 ? "Marcaciones enviadas" : "Marcaciones actualizadas",
        resultado.enviadas > 0
          ? `${resultado.enviadas} marcación${resultado.enviadas === 1 ? "" : "es"} enviada${resultado.enviadas === 1 ? "" : "s"}.`
          : "Quitamos una salida que ya estaba registrada.",
      );
    }
  }, [cargarTodo, fechaMarcaciones, mostrarToast, paginaMarcaciones.page]);

  useEffect(() => {
    let montado = true;
    void cargarTodo(1, null)
      .catch((causa) => {
        if (montado) {
          mostrarToast("error", "No pudimos cargar la jornada", mensajeError(causa));
        }
      })
      .finally(() => montado && setCargando(false));
    return () => {
      montado = false;
    };
  }, [cargarTodo, mostrarToast]);

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
    try {
      if (enLinea) await sincronizar();
      await cargarTodo(paginaMarcaciones.page, fechaMarcaciones);
    } catch (causa) {
      mostrarToast("error", "No pudimos actualizar la jornada", mensajeError(causa));
    } finally {
      setRefrescando(false);
    }
  }

  async function marcarEntrada(local: VisitaHoy["local"]) {
    setProcesando(true);
    setMensajeProceso("Comprobando tu ubicacion y registrando la entrada...");
    setUltimoCierreLocalId(null);
    try {
      const ubicacion = await leerUbicacion(sesion.usuario.id, "ENTRADA");
      await guardarEntradaPendiente(sesion.usuario.id, local.id, ubicacion);
      setEntradaClave(ubicacion.claveMovil);
      const resultado = await sincronizarMarcacionesPendientes();
      setPendientes(resultado.pendientes);
      if (resultado.ultimaVisita && !resultado.ultimaVisita.completadaEn) {
        setVisitaActiva(resultado.ultimaVisita);
        mostrarToast(
          "exito",
          "Entrada confirmada",
          `${local.nombre} · ${formatoFechaHoraCorta(resultado.ultimaVisita.iniciadaEn)}`,
        );
        await cargarAgenda();
      } else {
        mostrarToast(
          "advertencia",
          "Entrada guardada en el teléfono",
          "La enviaremos cuando vuelva internet.",
        );
      }
      if (resultado.ultimoError && enLinea) {
        mostrarToast("error", "No pudimos confirmar la entrada", resultado.ultimoError);
      }
    } catch (causa) {
      setPendientes(await cantidadMarcacionesPendientes());
      mostrarToast("error", "No pudimos marcar la entrada", mensajeError(causa));
    } finally {
      setProcesando(false);
      setMensajeProceso(null);
    }
  }

  async function marcarSalida() {
    if (!visitaActiva) return;
    setProcesando(true);
    setMensajeProceso("Comprobando tu ubicacion y registrando la salida...");
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
      const visitaFinalizada = resultado.ultimaVisita;
      if (
        visitaFinalizada?.id === visitaActiva.id &&
        visitaFinalizada.completadaEn
      ) {
        setVisitaActiva(null);
        setEntradaClave(null);
        setUltimoCierreLocalId(visitaActiva.localId);
        mostrarToast(
          "exito",
          "Salida confirmada",
          `${visitaActiva.localNombre} · Entrada ${formatoFechaHoraCorta(visitaActiva.iniciadaEn)} · Salida ${formatoFechaHoraCorta(visitaFinalizada.completadaEn)}`,
        );
        await cargarTodo(paginaMarcaciones.page, fechaMarcaciones);
      } else {
        mostrarToast(
          "advertencia",
          "Salida guardada en el teléfono",
          "La enviaremos cuando vuelva internet.",
        );
      }
      if (resultado.ultimoError && enLinea) {
        mostrarToast("error", "No pudimos confirmar la salida", resultado.ultimoError);
      }
    } catch (causa) {
      setPendientes(await cantidadMarcacionesPendientes());
      mostrarToast("error", "No pudimos marcar la salida", mensajeError(causa));
    } finally {
      setProcesando(false);
      setMensajeProceso(null);
    }
  }

  async function cerrar() {
    setProcesando(true);
    setMensajeProceso("Cerrando la sesion en este telefono...");
    try {
      await detenerGeocercas();
      await alCerrar();
    } finally {
      setProcesando(false);
      setMensajeProceso(null);
    }
  }

  function cambiarFechaMarcaciones(fecha: string | null) {
    setFechaMarcaciones(fecha);
    void cargarMarcaciones(1, fecha).catch((causa) =>
      mostrarToast("error", "No pudimos cargar las marcaciones", mensajeError(causa)),
    );
  }

  function cambiarPaginaMarcaciones(pagina: number) {
    void cargarMarcaciones(pagina, fechaMarcaciones).catch((causa) =>
      mostrarToast("error", "No pudimos cargar las marcaciones", mensajeError(causa)),
    );
  }

  const estadoConexion = `${enLinea ? "Con internet" : "Sin señal · guardado local activo"}${
    pendientes > 0 ? ` · ${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : ""
  }`;
  const contenido =
    seccion === "entrada" ? (
      visitaActiva ? (
        <VisitaActiva
          visita={visitaActiva}
          jornadaPendiente={esJornadaDeDiaAnterior(visitaActiva.iniciadaEn)}
          procesando={procesando}
          alSalir={marcarSalida}
        />
      ) : (
        <EntradaView
          agenda={agenda}
          faltanPermisosProximidad={faltanPermisosProximidad}
          localCerradoHoyId={ultimoCierreLocalId}
          procesando={procesando}
          proximidadActiva={proximidadActiva}
          alMarcar={marcarEntrada}
        />
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
      <View style={[styles.cabecera, { paddingTop: Math.max(insets.top, espacios.sm) + espacios.xs, paddingHorizontal: width < 360 ? espacios.md : espacios.xl }]}>
        <View style={styles.cabeceraTexto}>
          <Text style={styles.marca}>COMERCIA CAMPO</Text>
          <Text numberOfLines={1} style={styles.saludo}>Hola, {sesion.usuario.nombre}</Text>
          <Text style={styles.estadoConexion}>{estadoConexion}</Text>
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
        </View>
      </ScrollView>

      {toast ? (
        <ToastMovil
          arriba={Math.max(insets.top, espacios.sm) + 72}
          toast={toast}
          alCerrar={cerrarToast}
        />
      ) : null}

      <BackdropProceso
        detalle="No cierres la aplicacion mientras terminamos."
        titulo={mensajeProceso ?? "Procesando..."}
        visible={procesando}
      />

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
  pantalla: { backgroundColor: colores.fondo, flex: 1, position: "relative" },
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
