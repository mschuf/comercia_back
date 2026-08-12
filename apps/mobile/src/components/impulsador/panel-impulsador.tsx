/* Hallmark · Workbench amable · C4 navegación inferior segura. */
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  listarNotificacionesProximidad,
  marcarNotificacionesLeidas,
  obtenerAgendaGuardada,
  sincronizarGeocercas,
  type NotificacionProximidad,
} from "../../lib/proximidad";
import type { SesionMovil } from "../../lib/sesion";
import type {
  MarcacionResumen,
  RendimientoImpulsador,
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
  MarcacionesView,
  NotificacionesView,
  RendimientoView,
  VisitaActiva,
} from "./vistas";
import { distanciaMetros, leerUbicacion, mensajeError } from "./utils";

type Seccion = "entrada" | "marcaciones" | "rendimiento" | "notificaciones";

const SECCIONES: { id: Seccion; etiqueta: string }[] = [
  { id: "entrada", etiqueta: "Entrada" },
  { id: "marcaciones", etiqueta: "Marcaciones" },
  { id: "rendimiento", etiqueta: "Rendimiento" },
  { id: "notificaciones", etiqueta: "Avisos" },
];

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
  const [marcaciones, setMarcaciones] = useState<MarcacionResumen[]>([]);
  const [rendimiento, setRendimiento] = useState<RendimientoImpulsador | null>(null);
  const [notificaciones, setNotificaciones] = useState<NotificacionProximidad[]>([]);
  const [distancias, setDistancias] = useState<Record<number, number>>({});
  const [pendientes, setPendientes] = useState(0);
  const [avisosActivos, setAvisosActivos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
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
      const activa = await sincronizarGeocercas(sesion, respuesta.items, false).catch(() => false);
      setAvisosActivos(activa);
      return respuesta.items;
    } catch {
      const guardada = await obtenerAgendaGuardada(sesion.usuario.id);
      setAgenda(guardada);
      return guardada;
    }
  }, [sesion]);

  const cargarTodo = useCallback(async () => {
    const [agendaNueva, avisos, totalPendientes] = await Promise.all([
      cargarAgenda(),
      listarNotificacionesProximidad(sesion.usuario.id),
      cantidadMarcacionesPendientes(),
    ]);
    setNotificaciones(avisos);
    setPendientes(totalPendientes);
    const [historial, metricas] = await Promise.allSettled([
      obtenerMarcaciones(sesion.token).then(({ items }) => items),
      obtenerRendimiento(sesion.token),
    ]);
    if (historial.status === "fulfilled") setMarcaciones(historial.value);
    if (metricas.status === "fulfilled") setRendimiento(metricas.value);
    return agendaNueva;
  }, [cargarAgenda, sesion]);

  const sincronizar = useCallback(async () => {
    const resultado = await sincronizarMarcacionesPendientes();
    setPendientes(resultado.pendientes);
    if (resultado.ultimaVisita) {
      setVisitaActiva(resultado.ultimaVisita.completadaEn ? null : resultado.ultimaVisita);
    }
    if (resultado.enviadas > 0) {
      await cargarTodo();
      setMensaje(`${resultado.enviadas} marcación${resultado.enviadas === 1 ? "" : "es"} enviada${resultado.enviadas === 1 ? "" : "s"}.`);
    }
  }, [cargarTodo]);

  useEffect(() => {
    let montado = true;
    void cargarTodo()
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

  useEffect(() => {
    if (seccion !== "notificaciones") return;
    void marcarNotificacionesLeidas(sesion.usuario.id).then(() =>
      setNotificaciones((actuales) =>
        actuales.map((notificacion) => ({
          ...notificacion,
          leidaEn: notificacion.leidaEn ?? new Date().toISOString(),
        })),
      ),
    );
  }, [seccion, sesion.usuario.id]);

  async function refrescar() {
    setRefrescando(true);
    setError(null);
    try {
      if (enLinea) await sincronizar();
      await cargarTodo();
    } catch (causa) {
      setError(mensajeError(causa));
    } finally {
      setRefrescando(false);
    }
  }

  async function actualizarCercania() {
    setProcesando(true);
    setError(null);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== "granted") {
        throw new Error("Permití la ubicación para calcular tu cercanía.");
      }
      const actual = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setDistancias(
        Object.fromEntries(
          agenda.map(({ local }) => [
            local.id,
            distanciaMetros(actual.coords.latitude, actual.coords.longitude, local.latitud, local.longitud),
          ]),
        ),
      );
      setMensaje("Cercanía actualizada con la ubicación del teléfono.");
    } catch (causa) {
      setError(mensajeError(causa));
    } finally {
      setProcesando(false);
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
      setVisitaActiva(actualizada);
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
      const actualizada = tarea
        ? await subirFotoTarea(sesion.token, visitaActiva.id, tarea.id, resultado.assets[0].uri)
        : await subirFotoPresencia(sesion.token, visitaActiva.id, resultado.assets[0].uri);
      setVisitaActiva(actualizada);
      setMensaje("Evidencia guardada.");
    } catch (causa) {
      setError(mensajeError(causa));
    } finally {
      setProcesando(false);
    }
  }

  async function marcarSalida() {
    if (!visitaActiva) return;
    const incompletas = visitaActiva.tareas.filter(
      (tarea) => tarea.activa && !tarea.completada && !tarea.novedad,
    );
    if (incompletas.length > 0) {
      setError(`Completá ${incompletas.length} tarea${incompletas.length === 1 ? "" : "s"} antes de marcar la salida.`);
      return;
    }
    if (visitaActiva.tareas.some((tarea) => tarea.activa && tarea.completada && tarea.requiereFoto && !tarea.foto)) {
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
        await cargarTodo();
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

  function activarAvisos() {
    Alert.alert(
      "Avisos al llegar",
      "Comercia usará geocercas del teléfono para avisarte cuando estés cerca de un local de hoy. No enviará tu recorrido al servidor.",
      [
        { text: "Ahora no", style: "cancel" },
        {
          text: "Activar avisos",
          onPress: () => {
            setProcesando(true);
            void sincronizarGeocercas(sesion, agenda, true)
              .then((activo) => {
                setAvisosActivos(activo);
                if (!activo) {
                  setError("No se activaron los avisos. Revisá ubicación en segundo plano y notificaciones en Ajustes.");
                } else {
                  setMensaje("Avisos de llegada activados.");
                }
              })
              .catch((causa) => setError(mensajeError(causa)))
              .finally(() => setProcesando(false));
          },
        },
      ],
    );
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

  const noLeidas = notificaciones.filter(({ leidaEn }) => !leidaEn).length;
  const contenido =
    seccion === "entrada" ? (
      visitaActiva ? (
        <VisitaActiva visita={visitaActiva} procesando={procesando} alCambiarTarea={cambiarTarea} alTomarFoto={tomarFoto} alSalir={marcarSalida} />
      ) : (
        <EntradaView agenda={agenda} distancias={distancias} procesando={procesando} avisosActivos={avisosActivos} alActualizarCercania={actualizarCercania} alMarcar={marcarEntrada} alActivarAvisos={activarAvisos} />
      )
    ) : seccion === "marcaciones" ? (
      <MarcacionesView items={marcaciones} pendientes={pendientes} />
    ) : seccion === "rendimiento" ? (
      <RendimientoView datos={rendimiento} />
    ) : (
      <NotificacionesView items={notificaciones} avisosActivos={avisosActivos} alActivar={activarAvisos} alAbrirLocal={() => setSeccion("entrada")} />
    );

  return (
    <View style={styles.pantalla}>
      <View style={[styles.cabecera, { paddingTop: Math.max(insets.top, espacios.sm) + espacios.xs, paddingHorizontal: width < 360 ? espacios.md : espacios.xl }]}>
        <View style={styles.cabeceraTexto}>
          <Text style={styles.marca}>COMERCIA CAMPO</Text>
          <Text numberOfLines={1} style={styles.saludo}>Hola, {sesion.usuario.nombre}</Text>
          <Text style={styles.estadoConexion}>
            {enLinea ? "Con internet" : "Sin señal · guardado local activo"}
            {pendientes > 0 ? ` · ${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : ""}
          </Text>
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
          const cantidad = item.id === "notificaciones" ? noLeidas : 0;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              onPress={() => setSeccion(item.id)}
              style={({ pressed }) => [styles.tab, activa && styles.tabActivo, pressed && styles.presionado]}
            >
              <View style={[styles.indicadorTab, activa && styles.indicadorTabActivo]} />
              <Text numberOfLines={1} style={[styles.tabTexto, activa && styles.tabTextoActivo]}>{item.etiqueta}</Text>
              {cantidad > 0 ? <View style={styles.contador}><Text style={styles.contadorTexto}>{Math.min(9, cantidad)}</Text></View> : null}
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
  cabeceraTexto: { flex: 1, minWidth: 0 },
  marca: { color: colores.acento, fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  saludo: { color: colores.textoSobreOscuro, fontFamily: fuentes.titulos, fontSize: 22, fontWeight: "800", lineHeight: 28, marginTop: espacios.xxs },
  estadoConexion: { color: colores.textoSobreOscuroSecundario, fontSize: 12, lineHeight: 17, marginTop: espacios.xxs },
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
  tab: { alignItems: "center", borderRadius: radios.medio, flex: 1, justifyContent: "center", minHeight: 58, minWidth: 0, paddingHorizontal: espacios.xxs, position: "relative" },
  tabActivo: { backgroundColor: colores.tarjetaSuave },
  indicadorTab: { backgroundColor: "transparent", borderRadius: 2, height: 3, marginBottom: espacios.xxs, width: 18 },
  indicadorTabActivo: { backgroundColor: colores.primario },
  tabTexto: { color: colores.textoSecundario, fontSize: 10, fontWeight: "700", lineHeight: 13 },
  tabTextoActivo: { color: colores.primario, fontWeight: "900" },
  contador: { alignItems: "center", backgroundColor: colores.acento, borderRadius: 9, height: 18, justifyContent: "center", minWidth: 18, paddingHorizontal: espacios.xxs, position: "absolute", right: espacios.xs, top: espacios.xxs },
  contadorTexto: { color: colores.texto, fontSize: 10, fontWeight: "900" },
  presionado: { opacity: 0.78, transform: [{ translateY: 1 }] },
});
