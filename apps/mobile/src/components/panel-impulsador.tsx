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
  ErrorApi,
  obtenerAgendaHoy,
  obtenerMarcaciones,
  obtenerRendimiento,
  obtenerVisita,
  subirFotoPresencia,
  subirFotoTarea,
} from "../lib/api";
import {
  cantidadMarcacionesPendientes,
  guardarEntradaPendiente,
  guardarSalidaPendiente,
  nuevaClaveMarcacion,
  sincronizarMarcacionesPendientes,
} from "../lib/cola-marcaciones";
import {
  detenerGeocercas,
  listarNotificacionesProximidad,
  marcarNotificacionesLeidas,
  obtenerAgendaGuardada,
  sincronizarGeocercas,
  type NotificacionProximidad,
} from "../lib/proximidad";
import type { SesionMovil } from "../lib/sesion";
import type {
  CoordenadasMarcacion,
  MarcacionResumen,
  RendimientoImpulsador,
  TareaVisita,
  Visita,
  VisitaHoy,
} from "../types/impulsador";
import {
  anchoMaximoContenido,
  colores,
  espacios,
  fuentes,
  radios,
} from "../tema";

type Seccion = "entrada" | "marcaciones" | "rendimiento" | "notificaciones";

const SECCIONES: { id: Seccion; etiqueta: string }[] = [
  { id: "entrada", etiqueta: "Entrada" },
  { id: "marcaciones", etiqueta: "Marcaciones" },
  { id: "rendimiento", etiqueta: "Rendimiento" },
  { id: "notificaciones", etiqueta: "Avisos" },
];

function mensajeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message;
  if (error instanceof Error) {
    if (
      /fetch failed|network request|unknownhost|resolve host/i.test(
        error.message,
      )
    ) {
      return "No hay internet. Guardamos la marcación en este teléfono para enviarla cuando vuelva la señal.";
    }
    return error.message;
  }
  return "No pudimos completar la acción.";
}

function fechaHora(valor: string | null): string {
  if (!valor) return "Pendiente";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

function distanciaMetros(
  latitud1: number,
  longitud1: number,
  latitud2: number,
  longitud2: number,
): number {
  const radioTierra = 6_371_000;
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;
  const deltaLatitud = aRadianes(latitud2 - latitud1);
  const deltaLongitud = aRadianes(longitud2 - longitud1);
  const a =
    Math.sin(deltaLatitud / 2) ** 2 +
    Math.cos(aRadianes(latitud1)) *
      Math.cos(aRadianes(latitud2)) *
      Math.sin(deltaLongitud / 2) ** 2;
  return radioTierra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function leerUbicacion(
  usuarioId: number,
  tipo: "ENTRADA" | "SALIDA",
): Promise<CoordenadasMarcacion> {
  const servicios = await Location.hasServicesEnabledAsync();
  if (!servicios) {
    throw new Error("Activá la ubicación del teléfono para marcar.");
  }
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (permiso.status !== "granted") {
    throw new Error(
      "Permití la ubicación para confirmar que estás en el local.",
    );
  }
  const ubicacion = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitud: ubicacion.coords.latitude,
    longitud: ubicacion.coords.longitude,
    precisionMetros: ubicacion.coords.accuracy ?? undefined,
    registradaEn: new Date(ubicacion.timestamp).toISOString(),
    claveMovil: nuevaClaveMarcacion(usuarioId, tipo),
  };
}

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
  const [rendimiento, setRendimiento] = useState<RendimientoImpulsador | null>(
    null,
  );
  const [notificaciones, setNotificaciones] = useState<
    NotificacionProximidad[]
  >([]);
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
      const abierta = respuesta.items.find(
        ({ visitaAbiertaId }) => visitaAbiertaId,
      );
      if (abierta?.visitaAbiertaId) {
        const visita = await obtenerVisita(
          sesion.token,
          abierta.visitaAbiertaId,
        );
        setVisitaActiva(visita);
        setEntradaClave(`visita:${visita.id}`);
      } else {
        setVisitaActiva(null);
        setEntradaClave(null);
      }
      const activa = await sincronizarGeocercas(
        sesion,
        respuesta.items,
        false,
      ).catch(() => false);
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
      setVisitaActiva(
        resultado.ultimaVisita.completadaEn ? null : resultado.ultimaVisita,
      );
    }
    if (resultado.enviadas > 0) {
      await cargarTodo();
      setMensaje(
        `${resultado.enviadas} marcación${resultado.enviadas === 1 ? "" : "es"} enviada${resultado.enviadas === 1 ? "" : "s"}.`,
      );
    }
  }, [cargarTodo]);

  useEffect(() => {
    let montado = true;
    void cargarTodo()
      .catch((e) => montado && setError(mensajeError(e)))
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
      if (estado === "active") {
        void sincronizar().catch(() => undefined);
      }
    });
    const suscripcionNotificacion =
      Notifications.addNotificationResponseReceivedListener(() => {
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

  const noLeidas = notificaciones.filter(({ leidaEn }) => !leidaEn).length;

  async function refrescar() {
    setRefrescando(true);
    setError(null);
    try {
      if (enLinea) await sincronizar();
      await cargarTodo();
    } catch (e) {
      setError(mensajeError(e));
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
      const actual = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setDistancias(
        Object.fromEntries(
          agenda.map(({ local }) => [
            local.id,
            distanciaMetros(
              actual.coords.latitude,
              actual.coords.longitude,
              local.latitud,
              local.longitud,
            ),
          ]),
        ),
      );
      setMensaje("Cercanía actualizada con la ubicación del teléfono.");
    } catch (e) {
      setError(mensajeError(e));
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
        setMensaje(
          "Entrada guardada en este teléfono. La enviaremos cuando vuelva internet.",
        );
      }
      if (resultado.ultimoError && enLinea) setError(resultado.ultimoError);
    } catch (e) {
      setPendientes(await cantidadMarcacionesPendientes());
      setError(mensajeError(e));
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarTarea(tarea: TareaVisita) {
    if (!visitaActiva) return;
    setProcesando(true);
    setError(null);
    try {
      const actualizada = await actualizarTareaVisita(
        sesion.token,
        visitaActiva.id,
        tarea,
        !tarea.completada,
      );
      setVisitaActiva(actualizada);
    } catch (e) {
      setError(mensajeError(e));
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
      if (!permiso.granted) {
        throw new Error("Permití la cámara para adjuntar la evidencia.");
      }
      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });
      if (resultado.canceled || !resultado.assets[0]) return;
      const actualizada = tarea
        ? await subirFotoTarea(
            sesion.token,
            visitaActiva.id,
            tarea.id,
            resultado.assets[0].uri,
          )
        : await subirFotoPresencia(
            sesion.token,
            visitaActiva.id,
            resultado.assets[0].uri,
          );
      setVisitaActiva(actualizada);
      setMensaje("Evidencia guardada.");
    } catch (e) {
      setError(mensajeError(e));
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
      setError(
        `Completá ${incompletas.length} tarea${incompletas.length === 1 ? "" : "s"} antes de marcar la salida.`,
      );
      return;
    }
    if (
      visitaActiva.tareas.some(
        (tarea) =>
          tarea.activa && tarea.completada && tarea.requiereFoto && !tarea.foto,
      )
    ) {
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
    } catch (e) {
      setPendientes(await cantidadMarcacionesPendientes());
      setError(mensajeError(e));
    } finally {
      setProcesando(false);
    }
  }

  async function activarAvisos() {
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
                  setError(
                    "No se activaron los avisos. Revisá ubicación en segundo plano y notificaciones en Ajustes.",
                  );
                } else {
                  setMensaje("Avisos de llegada activados.");
                }
              })
              .catch((e) => setError(mensajeError(e)))
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

  const contenido =
    seccion === "entrada" ? (
      visitaActiva ? (
        <VisitaActiva
          visita={visitaActiva}
          procesando={procesando}
          alCambiarTarea={cambiarTarea}
          alTomarFoto={tomarFoto}
          alSalir={marcarSalida}
        />
      ) : (
        <EntradaView
          agenda={agenda}
          distancias={distancias}
          procesando={procesando}
          avisosActivos={avisosActivos}
          alActualizarCercania={actualizarCercania}
          alMarcar={marcarEntrada}
          alActivarAvisos={activarAvisos}
        />
      )
    ) : seccion === "marcaciones" ? (
      <MarcacionesView items={marcaciones} pendientes={pendientes} />
    ) : seccion === "rendimiento" ? (
      <RendimientoView datos={rendimiento} />
    ) : (
      <NotificacionesView
        items={notificaciones}
        avisosActivos={avisosActivos}
        alActivar={activarAvisos}
        alAbrirLocal={() => setSeccion("entrada")}
      />
    );

  return (
    <View style={styles.pantalla}>
      <View
        style={[
          styles.cabecera,
          {
            paddingTop: Math.max(insets.top, espacios.sm) + espacios.xs,
            paddingHorizontal: width < 360 ? espacios.md : espacios.xl,
          },
        ]}
      >
        <View style={styles.cabeceraTexto}>
          <Text style={styles.marca}>COMERCIA CAMPO</Text>
          <Text numberOfLines={1} style={styles.saludo}>
            Hola, {sesion.usuario.nombre}
          </Text>
          <Text style={styles.estadoConexion}>
            {enLinea ? "Con internet" : "Sin señal · guardado local activo"}
            {pendientes > 0
              ? ` · ${pendientes} pendiente${pendientes === 1 ? "" : "s"}`
              : ""}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void cerrar()}
          disabled={procesando}
          style={({ pressed }) => [
            styles.botonSalirCuenta,
            pressed && styles.presionado,
          ]}
        >
          <Text style={styles.botonSalirCuentaTexto}>Salir</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.contenido,
          {
            paddingHorizontal: width < 360 ? espacios.md : espacios.xl,
            paddingBottom: Math.max(insets.bottom, espacios.sm) + 104,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => void refrescar()}
            tintColor={colores.primario}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.columna, { maxWidth: anchoMaximoContenido }]}>
          {cargando ? (
            <View style={styles.cargando}>
              <ActivityIndicator color={colores.primario} size="large" />
              <Text style={styles.textoSecundario}>Preparando tu jornada…</Text>
            </View>
          ) : (
            contenido
          )}
          {mensaje ? (
            <View style={styles.mensaje} accessibilityLiveRegion="polite">
              <Text style={styles.mensajeTexto}>{mensaje}</Text>
            </View>
          ) : null}
          {error ? (
            <View style={styles.error} accessibilityLiveRegion="assertive">
              <Text style={styles.errorTitulo}>Revisemos esto</Text>
              <Text style={styles.errorTexto}>{error}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.navegacion,
          {
            paddingBottom: Math.max(insets.bottom, espacios.xs),
            paddingHorizontal: width < 360 ? espacios.xs : espacios.sm,
          },
        ]}
      >
        {SECCIONES.map((item) => {
          const activa = seccion === item.id;
          const cantidad = item.id === "notificaciones" ? noLeidas : 0;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              onPress={() => setSeccion(item.id)}
              style={({ pressed }) => [
                styles.tab,
                activa && styles.tabActivo,
                pressed && styles.presionado,
              ]}
            >
              <View
                style={[
                  styles.indicadorTab,
                  activa && styles.indicadorTabActivo,
                ]}
              />
              <Text
                numberOfLines={1}
                style={[styles.tabTexto, activa && styles.tabTextoActivo]}
              >
                {item.etiqueta}
              </Text>
              {cantidad > 0 ? (
                <View style={styles.contador}>
                  <Text style={styles.contadorTexto}>
                    {Math.min(9, cantidad)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TituloPantalla({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle: string;
}) {
  return (
    <View style={styles.tituloPantalla}>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.descripcion}>{detalle}</Text>
    </View>
  );
}

function EntradaView({
  agenda,
  distancias,
  procesando,
  avisosActivos,
  alActualizarCercania,
  alMarcar,
  alActivarAvisos,
}: {
  agenda: VisitaHoy[];
  distancias: Record<number, number>;
  procesando: boolean;
  avisosActivos: boolean;
  alActualizarCercania: () => Promise<void>;
  alMarcar: (local: VisitaHoy["local"]) => Promise<void>;
  alActivarAvisos: () => void;
}) {
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo="Tu jornada de hoy"
        detalle="Elegí el local al llegar. Confirmaremos la distancia antes de guardar la entrada."
      />
      <View style={styles.filaAcciones}>
        <Pressable
          onPress={() => void alActualizarCercania()}
          disabled={procesando}
          style={({ pressed }) => [
            styles.botonSecundario,
            pressed && styles.presionado,
          ]}
        >
          <Text style={styles.botonSecundarioTexto}>Actualizar cercanía</Text>
        </Pressable>
        {!avisosActivos ? (
          <Pressable
            onPress={alActivarAvisos}
            style={({ pressed }) => [
              styles.botonSuave,
              pressed && styles.presionado,
            ]}
          >
            <Text style={styles.botonSuaveTexto}>Activar avisos</Text>
          </Pressable>
        ) : null}
      </View>
      {agenda.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioTitulo}>
            No tenés locales programados hoy
          </Text>
          <Text style={styles.textoSecundario}>
            Cuando tu Team Leader asigne una visita, aparecerá en esta pantalla.
          </Text>
        </View>
      ) : (
        agenda.map((visita) => {
          const distancia = distancias[visita.local.id];
          const dentro =
            distancia !== undefined && distancia <= visita.local.radioMetros;
          return (
            <View key={visita.clave} style={styles.tarjetaLocal}>
              <View style={styles.filaEntre}>
                <View style={styles.flexible}>
                  <Text style={styles.localNombre}>{visita.local.nombre}</Text>
                  <Text style={styles.clienteNombre}>
                    {visita.local.cliente.nombre}
                  </Text>
                </View>
                <View style={styles.horaChip}>
                  <Text style={styles.horaChipTexto}>
                    {new Intl.DateTimeFormat("es-PY", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(visita.programadaEn))}
                  </Text>
                </View>
              </View>
              <View style={styles.detallesLocal}>
                <Text style={styles.textoSecundario}>
                  Radio permitido: {visita.local.radioMetros} m
                </Text>
                <Text style={styles.textoSecundario}>
                  {visita.tareasActivas} tarea
                  {visita.tareasActivas === 1 ? "" : "s"}
                </Text>
                {distancia !== undefined ? (
                  <Text style={dentro ? styles.dentro : styles.fuera}>
                    Estás a {Math.round(distancia)} m ·{" "}
                    {dentro ? "podés marcar" : "acercate un poco más"}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => void alMarcar(visita.local)}
                disabled={procesando}
                style={({ pressed }) => [
                  styles.botonPrimario,
                  pressed && styles.presionado,
                ]}
              >
                {procesando ? (
                  <ActivityIndicator color={colores.textoSobreOscuro} />
                ) : (
                  <Text style={styles.botonPrimarioTexto}>Marcar entrada</Text>
                )}
              </Pressable>
            </View>
          );
        })
      )}
    </View>
  );
}

function VisitaActiva({
  visita,
  procesando,
  alCambiarTarea,
  alTomarFoto,
  alSalir,
}: {
  visita: Visita;
  procesando: boolean;
  alCambiarTarea: (tarea: TareaVisita) => Promise<void>;
  alTomarFoto: (tarea?: TareaVisita) => Promise<void>;
  alSalir: () => Promise<void>;
}) {
  const completadas = visita.tareas.filter(
    ({ completada }) => completada,
  ).length;
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo={`Estás en ${visita.localNombre}`}
        detalle={`Entrada ${fechaHora(visita.iniciadaEn)} · ${Math.round(visita.distanciaMetros)} m del local`}
      />
      <View style={styles.progresoTarjeta}>
        <Text style={styles.progresoNumero}>
          {completadas}/{visita.tareas.length}
        </Text>
        <Text style={styles.textoSecundario}>tareas completadas</Text>
      </View>
      {visita.tareas.map((tarea) => (
        <View key={tarea.id} style={styles.tarea}>
          <Pressable
            onPress={() => void alCambiarTarea(tarea)}
            disabled={procesando || !tarea.activa}
            style={styles.tareaPrincipal}
          >
            <View
              style={[styles.check, tarea.completada && styles.checkActivo]}
            >
              <Text style={styles.checkTexto}>
                {tarea.completada ? "✓" : ""}
              </Text>
            </View>
            <View style={styles.flexible}>
              <Text
                style={[
                  styles.tareaTitulo,
                  !tarea.activa && styles.textoInactivo,
                ]}
              >
                {tarea.titulo}
              </Text>
              <Text style={styles.textoSecundario}>{tarea.descripcion}</Text>
            </View>
          </Pressable>
          {tarea.requiereFoto ? (
            <Pressable
              onPress={() => void alTomarFoto(tarea)}
              disabled={procesando}
              style={({ pressed }) => [
                styles.botonFoto,
                pressed && styles.presionado,
              ]}
            >
              <Text style={styles.botonFotoTexto}>
                {tarea.foto ? "Foto lista" : "Tomar foto"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {visita.requiereFotoPresencia ? (
        <Pressable
          onPress={() => void alTomarFoto()}
          disabled={procesando}
          style={({ pressed }) => [
            styles.botonSecundario,
            pressed && styles.presionado,
          ]}
        >
          <Text style={styles.botonSecundarioTexto}>
            {visita.fotoPresencia
              ? "Foto de presencia lista"
              : "Tomar foto de presencia"}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => void alSalir()}
        disabled={procesando}
        style={({ pressed }) => [
          styles.botonSalida,
          pressed && styles.presionado,
        ]}
      >
        {procesando ? (
          <ActivityIndicator color={colores.textoSobreOscuro} />
        ) : (
          <Text style={styles.botonPrimarioTexto}>Marcar salida</Text>
        )}
      </Pressable>
    </View>
  );
}

function MarcacionesView({
  items,
  pendientes,
}: {
  items: MarcacionResumen[];
  pendientes: number;
}) {
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo="Mis marcaciones"
        detalle="Tu historial de entradas y salidas por local."
      />
      {pendientes > 0 ? (
        <View style={styles.avisoPendiente}>
          <Text style={styles.avisoPendienteTexto}>
            {pendientes} marcación{pendientes === 1 ? "" : "es"} guardada
            {pendientes === 1 ? "" : "s"} en el teléfono.
          </Text>
        </View>
      ) : null}
      {items.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioTitulo}>Todavía no hay marcaciones</Text>
          <Text style={styles.textoSecundario}>
            Tu primera entrada aparecerá acá.
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.tarjetaLista}>
            <View style={styles.filaEntre}>
              <View style={styles.flexible}>
                <Text style={styles.localNombre}>{item.localNombre}</Text>
                <Text style={styles.clienteNombre}>{item.clienteNombre}</Text>
              </View>
              <Text
                style={
                  item.completadaEn ? styles.estadoListo : styles.estadoCurso
                }
              >
                {item.completadaEn ? "Completa" : "En curso"}
              </Text>
            </View>
            <Text style={styles.textoSecundario}>
              Entrada: {fechaHora(item.iniciadaEn)}
            </Text>
            <Text style={styles.textoSecundario}>
              Salida: {fechaHora(item.completadaEn)}
            </Text>
            <Text style={styles.tareaResumen}>
              {item.tareasCompletadas}/{item.tareasTotal} tareas ·{" "}
              {Math.round(item.distanciaMetros)} m
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function RendimientoView({ datos }: { datos: RendimientoImpulsador | null }) {
  if (!datos) {
    return (
      <TituloPantalla
        titulo="Rendimiento"
        detalle="Conectate para actualizar tus resultados."
      />
    );
  }
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo="Tu rendimiento"
        detalle="Resumen de los últimos 30 días."
      />
      <View style={styles.metricasGrid}>
        <Metrica
          titulo="Presentaciones"
          valor={`${datos.presentacionesPorcentaje}%`}
          detalle={`${datos.presentacionesRealizadas} de ${datos.presentacionesProgramadas}`}
        />
        <Metrica
          titulo="Tareas"
          valor={`${datos.tareasPorcentaje}%`}
          detalle={`${datos.tareasCompletadas} de ${datos.tareasTotales}`}
        />
        <Metrica
          titulo="Locales visitados"
          valor={String(datos.localesVisitados)}
          detalle={`${datos.localesAsignados} asignados`}
        />
        <Metrica
          titulo="En curso"
          valor={String(datos.visitasEnCurso)}
          detalle="visitas abiertas"
        />
      </View>
    </View>
  );
}

function Metrica({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <View style={styles.metrica}>
      <Text style={styles.metricaTitulo}>{titulo}</Text>
      <Text style={styles.metricaValor}>{valor}</Text>
      <Text style={styles.textoSecundario}>{detalle}</Text>
    </View>
  );
}

function NotificacionesView({
  items,
  avisosActivos,
  alActivar,
  alAbrirLocal,
}: {
  items: NotificacionProximidad[];
  avisosActivos: boolean;
  alActivar: () => void;
  alAbrirLocal: () => void;
}) {
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo="Avisos de llegada"
        detalle="Recordatorios creados por el teléfono cuando estás cerca de un local de hoy."
      />
      {!avisosActivos ? (
        <Pressable
          onPress={alActivar}
          style={({ pressed }) => [
            styles.botonPrimario,
            pressed && styles.presionado,
          ]}
        >
          <Text style={styles.botonPrimarioTexto}>Activar avisos</Text>
        </Pressable>
      ) : (
        <View style={styles.avisoActivo}>
          <Text style={styles.avisoActivoTexto}>
            Avisos activos · no se envía un recorrido al servidor
          </Text>
        </View>
      )}
      {items.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioTitulo}>Sin avisos por ahora</Text>
          <Text style={styles.textoSecundario}>
            Cuando llegues cerca de un local, el aviso aparecerá acá.
          </Text>
        </View>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.id}
            onPress={alAbrirLocal}
            style={({ pressed }) => [
              styles.tarjetaLista,
              pressed && styles.presionado,
            ]}
          >
            <View style={styles.filaEntre}>
              <View style={styles.flexible}>
                <Text style={styles.localNombre}>{item.localNombre}</Text>
                <Text style={styles.clienteNombre}>{item.clienteNombre}</Text>
              </View>
              {!item.leidaEn ? <View style={styles.puntoNuevo} /> : null}
            </View>
            <Text style={styles.textoSecundario}>
              {fechaHora(item.creadaEn)}
            </Text>
            <Text style={styles.enlaceTexto}>Abrir jornada</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  cabecera: {
    backgroundColor: colores.fondoElevado,
    paddingBottom: espacios.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: espacios.md,
  },
  cabeceraTexto: { flex: 1, minWidth: 0 },
  marca: {
    color: colores.acento,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  saludo: {
    color: colores.textoSobreOscuro,
    fontFamily: fuentes.titulos,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    marginTop: espacios.xxs,
  },
  estadoConexion: {
    color: colores.textoSobreOscuroSecundario,
    fontSize: 12,
    lineHeight: 17,
    marginTop: espacios.xxs,
  },
  botonSalirCuenta: {
    minWidth: 54,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colores.bordeSobreOscuro,
    borderRadius: radios.redondo,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacios.sm,
  },
  botonSalirCuentaTexto: {
    color: colores.textoSobreOscuro,
    fontWeight: "700",
    fontSize: 13,
  },
  contenido: { flexGrow: 1, paddingTop: espacios.xl },
  columna: { width: "100%", alignSelf: "center", gap: espacios.md },
  cargando: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: espacios.md,
  },
  seccion: { gap: espacios.md },
  tituloPantalla: { gap: espacios.xs, marginBottom: espacios.xs },
  titulo: {
    color: colores.texto,
    fontFamily: fuentes.titulos,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  descripcion: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22 },
  textoSecundario: {
    color: colores.textoSecundario,
    fontSize: 13,
    lineHeight: 19,
  },
  filaAcciones: { flexDirection: "row", flexWrap: "wrap", gap: espacios.sm },
  filaEntre: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: espacios.sm,
  },
  flexible: { flex: 1, minWidth: 0 },
  tarjetaLocal: {
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.grande,
    padding: espacios.lg,
    gap: espacios.md,
  },
  tarjetaLista: {
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.medio,
    padding: espacios.md,
    gap: espacios.xs,
  },
  localNombre: {
    color: colores.texto,
    fontFamily: fuentes.titulos,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  clienteNombre: {
    color: colores.textoSecundario,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  horaChip: {
    backgroundColor: colores.acentoSuave,
    borderRadius: radios.redondo,
    paddingHorizontal: espacios.sm,
    paddingVertical: espacios.xs,
  },
  horaChipTexto: {
    color: colores.advertencia,
    fontSize: 13,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  detallesLocal: { gap: espacios.xxs },
  dentro: {
    color: colores.exito,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: espacios.xxs,
  },
  fuera: {
    color: colores.advertencia,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: espacios.xxs,
  },
  botonPrimario: {
    minHeight: 50,
    borderRadius: radios.medio,
    backgroundColor: colores.primario,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacios.lg,
  },
  botonSalida: {
    minHeight: 54,
    borderRadius: radios.medio,
    backgroundColor: colores.fondoElevado,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacios.lg,
    marginTop: espacios.xs,
  },
  botonPrimarioTexto: {
    color: colores.textoSobreOscuro,
    fontSize: 15,
    fontWeight: "800",
  },
  botonSecundario: {
    minHeight: 46,
    borderRadius: radios.medio,
    borderWidth: 1,
    borderColor: colores.primario,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacios.md,
    flexGrow: 1,
  },
  botonSecundarioTexto: {
    color: colores.primario,
    fontSize: 14,
    fontWeight: "800",
  },
  botonSuave: {
    minHeight: 46,
    borderRadius: radios.medio,
    backgroundColor: colores.acentoSuave,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacios.md,
    flexGrow: 1,
  },
  botonSuaveTexto: {
    color: colores.advertencia,
    fontSize: 14,
    fontWeight: "800",
  },
  presionado: { opacity: 0.78, transform: [{ translateY: 1 }] },
  vacio: {
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colores.borde,
    borderRadius: radios.grande,
    padding: espacios.xl,
    alignItems: "center",
    gap: espacios.xs,
  },
  vacioTitulo: {
    color: colores.texto,
    fontFamily: fuentes.titulos,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  progresoTarjeta: {
    backgroundColor: colores.acentoSuave,
    borderRadius: radios.medio,
    padding: espacios.md,
  },
  progresoNumero: {
    color: colores.advertencia,
    fontFamily: fuentes.titulos,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  tarea: {
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.medio,
    padding: espacios.md,
    gap: espacios.sm,
  },
  tareaPrincipal: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: espacios.sm,
  },
  check: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  checkActivo: {
    backgroundColor: colores.primario,
    borderColor: colores.primario,
  },
  checkTexto: {
    color: colores.textoSobreOscuro,
    fontSize: 17,
    fontWeight: "900",
  },
  tareaTitulo: {
    color: colores.texto,
    fontFamily: fuentes.titulos,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  textoInactivo: {
    color: colores.inactivo,
    textDecorationLine: "line-through",
  },
  botonFoto: {
    minHeight: 44,
    borderRadius: radios.pequeno,
    backgroundColor: colores.tarjetaSuave,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacios.md,
  },
  botonFotoTexto: { color: colores.primario, fontSize: 13, fontWeight: "800" },
  avisoPendiente: {
    backgroundColor: colores.advertenciaSuave,
    borderRadius: radios.medio,
    padding: espacios.md,
  },
  avisoPendienteTexto: {
    color: colores.advertencia,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  avisoActivo: {
    backgroundColor: colores.tarjetaSuave,
    borderRadius: radios.medio,
    padding: espacios.md,
  },
  avisoActivoTexto: {
    color: colores.textoAviso,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  estadoListo: { color: colores.exito, fontSize: 12, fontWeight: "800" },
  estadoCurso: { color: colores.advertencia, fontSize: 12, fontWeight: "800" },
  tareaResumen: {
    color: colores.texto,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: espacios.xxs,
  },
  metricasGrid: { flexDirection: "row", flexWrap: "wrap", gap: espacios.sm },
  metrica: {
    width: "48%",
    minWidth: 140,
    flexGrow: 1,
    backgroundColor: colores.tarjeta,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.grande,
    padding: espacios.lg,
  },
  metricaTitulo: {
    color: colores.textoSecundario,
    fontSize: 13,
    fontWeight: "700",
  },
  metricaValor: {
    color: colores.texto,
    fontFamily: fuentes.titulos,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    marginVertical: espacios.xs,
  },
  enlaceTexto: {
    color: colores.primario,
    fontSize: 13,
    fontWeight: "800",
    marginTop: espacios.xs,
  },
  puntoNuevo: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colores.acento,
    marginTop: espacios.xs,
  },
  mensaje: {
    backgroundColor: colores.tarjetaSuave,
    borderRadius: radios.medio,
    padding: espacios.md,
  },
  mensajeTexto: {
    color: colores.textoAviso,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  error: {
    backgroundColor: colores.errorFondo,
    borderRadius: radios.medio,
    padding: espacios.md,
    gap: espacios.xxs,
  },
  errorTitulo: { color: colores.errorTexto, fontSize: 14, fontWeight: "900" },
  errorTexto: { color: colores.errorTexto, fontSize: 13, lineHeight: 19 },
  navegacion: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: espacios.xxs,
    paddingTop: espacios.xs,
    backgroundColor: colores.tarjeta,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    borderRadius: radios.medio,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacios.xxs,
    position: "relative",
  },
  tabActivo: { backgroundColor: colores.tarjetaSuave },
  indicadorTab: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
    marginBottom: espacios.xxs,
  },
  indicadorTabActivo: { backgroundColor: colores.primario },
  tabTexto: {
    color: colores.textoSecundario,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
  },
  tabTextoActivo: { color: colores.primario, fontWeight: "900" },
  contador: {
    position: "absolute",
    top: espacios.xxs,
    right: espacios.xs,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colores.acento,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacios.xxs,
  },
  contadorTexto: { color: colores.texto, fontSize: 10, fontWeight: "900" },
});
