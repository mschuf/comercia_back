/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Hallmark · contrast: pass · tokens: pass · mobile: pass · slop: pass */
import * as Network from "expo-network";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  ErrorApi,
  iniciarSesionMovil,
  iniciarSesionMovilConSim,
  obtenerUsuarioActual,
} from "./src/lib/api";
import {
  borrarSesion,
  guardarSesion,
  obtenerSesion,
  type SesionMovil,
} from "./src/lib/sesion";
import {
  activarSeguimiento,
  cantidadUbicacionesPendientes,
  detenerSeguimiento,
  estaSeguimientoActivo,
  reanudarSeguimiento,
  sincronizarUbicacionesPendientes,
  sincronizarRevocacionPendiente,
} from "./src/lib/seguimiento";
import { diagnosticarSim } from "./src/lib/sim";
import {
  anchoMaximoContenido,
  colores,
  espacios,
  radios,
} from "./src/tema";

function textoError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message;
  if (error instanceof Error) {
    if (
      /fetch failed|unknownhost|network request failed|unable to resolve host/i.test(
        error.message,
      )
    ) {
      return "No hay conexión a internet. Volvé a intentar cuando tengas señal.";
    }
    return error.message;
  }
  return "Ocurrió un error inesperado.";
}

function hayInternet(estado: Network.NetworkState): boolean {
  return estado.isConnected === true && estado.isInternetReachable !== false;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Aplicacion />
    </SafeAreaProvider>
  );
}

function Aplicacion() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const compacto = height < 720 || width < 360;
  const [sesion, setSesion] = useState<SesionMovil | null>(null);
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [seguimientoActivo, setSeguimientoActivo] = useState(false);
  const [enLinea, setEnLinea] = useState<boolean | null>(null);
  const [pendientes, setPendientes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [estadoSim, setEstadoSim] = useState(
    "Buscando una cuenta asociada a la SIM…",
  );

  const actualizarPendientes = useCallback(async () => {
    const total = await cantidadUbicacionesPendientes().catch(() => 0);
    setPendientes(total);
    return total;
  }, []);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const resultado = await sincronizarUbicacionesPendientes();
      setPendientes(resultado.pendientes);
      if (resultado.pendientes === 0) {
        await sincronizarRevocacionPendiente();
      }
    } catch (errorDeSincronizacion) {
      if (
        errorDeSincronizacion instanceof ErrorApi &&
        [401, 403].includes(errorDeSincronizacion.status)
      ) {
        setSeguimientoActivo(false);
        setError("La sesión venció. Iniciá sesión nuevamente.");
      }
    } finally {
      setSincronizando(false);
    }
  }, []);

  useEffect(() => {
    let montada = true;
    void (async () => {
      try {
        const sesionGuardada = await obtenerSesion();
        if (sesionGuardada) {
          if (!montada) return;
          setSesion(sesionGuardada);
          const reanudado = await reanudarSeguimiento();
          if (!montada) return;
          setSeguimientoActivo(reanudado || (await estaSeguimientoActivo()));
          await actualizarPendientes();
        } else {
          const lectura = await diagnosticarSim(true);
          if (!montada) return;
          const telefonos = [
            ...new Set(
              lectura.sims
                .map((sim) => sim.number)
                .filter((numero): numero is string => Boolean(numero)),
            ),
          ];

          if (telefonos.length === 0) {
            setEstadoSim(
              "Android no entregó el número de la SIM. Ingresá con tus credenciales.",
            );
          } else {
            try {
              const nuevaSesion = await iniciarSesionMovilConSim(telefonos);
              await guardarSesion(nuevaSesion);
              if (!montada) return;
              setSesion(nuevaSesion);
              setEstadoSim("Cuenta reconocida automáticamente.");
              await actualizarPendientes();
            } catch (errorDeSim) {
              if (!montada) return;
              setEstadoSim(
                errorDeSim instanceof ErrorApi &&
                  [400, 401, 403, 404].includes(errorDeSim.status)
                  ? "La SIM no coincide con una cuenta activa. Ingresá con tus credenciales."
                  : "No pudimos comprobar la SIM ahora. Podés ingresar con tus credenciales.",
              );
            }
          }
        }
      } catch (errorDeInicio) {
        if (montada) setError(textoError(errorDeInicio));
      } finally {
        if (montada) setCargando(false);
      }
    })();
    return () => {
      montada = false;
    };
  }, [actualizarPendientes]);

  useEffect(() => {
    let montada = true;

    const refrescarPerfil = async () => {
      if (!sesion) return;

      try {
        const { usuario } = await obtenerUsuarioActual(sesion.token);
        if (!montada) return;
        if (JSON.stringify(usuario) === JSON.stringify(sesion.usuario)) return;

        const sesionActualizada: SesionMovil = { ...sesion, usuario };
        await guardarSesion(sesionActualizada);
        if (!montada) return;
        setSesion((sesionVigente) =>
          sesionVigente?.token === sesion.token
            ? sesionActualizada
            : sesionVigente,
        );
      } catch (errorDePerfil) {
        if (
          montada &&
          errorDePerfil instanceof ErrorApi &&
          [401, 403].includes(errorDePerfil.status)
        ) {
          setError("La sesión venció. Iniciá sesión nuevamente.");
        }
        // Sin internet se conserva el perfil local y se reintenta al reconectar.
      }
    };

    const aplicarEstado = async (estado: Network.NetworkState) => {
      if (!montada) return;
      const disponible = hayInternet(estado);
      setEnLinea(disponible);
      if (disponible && sesion) {
        await Promise.all([refrescarPerfil(), sincronizar()]);
      }
    };

    void Network.getNetworkStateAsync().then(aplicarEstado).catch(() => {
      if (montada) setEnLinea(false);
    });
    const suscripcionRed = Network.addNetworkStateListener((estado) => {
      void aplicarEstado(estado);
    });
    const suscripcionApp = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        void Network.getNetworkStateAsync().then(aplicarEstado);
        if (sesion) void actualizarPendientes();
      }
    });
    const temporizador = setInterval(() => {
      if (sesion) void actualizarPendientes();
    }, 15_000);

    return () => {
      montada = false;
      suscripcionRed.remove();
      suscripcionApp.remove();
      clearInterval(temporizador);
    };
  }, [actualizarPendientes, sesion, sincronizar]);

  async function iniciarSesion() {
    if (!identificador.trim() || !password) {
      setError("Ingresá tu correo o usuario y tu contraseña.");
      return;
    }
    setProcesando(true);
    setError(null);
    try {
      const nuevaSesion = await iniciarSesionMovil(
        identificador.trim(),
        password,
      );
      await guardarSesion(nuevaSesion);
      setSesion(nuevaSesion);
      setPassword("");
      await actualizarPendientes();
    } catch (errorDeLogin) {
      setError(textoError(errorDeLogin));
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarSeguimiento() {
    setProcesando(true);
    setError(null);
    try {
      if (seguimientoActivo) {
        await detenerSeguimiento();
        setSeguimientoActivo(false);
      } else {
        await activarSeguimiento();
        setSeguimientoActivo(true);
      }
      await actualizarPendientes();
    } catch (errorDeSeguimiento) {
      setSeguimientoActivo(await estaSeguimientoActivo().catch(() => false));
      setError(textoError(errorDeSeguimiento));
    } finally {
      setProcesando(false);
    }
  }

  async function cerrarSesion() {
    setProcesando(true);
    setError(null);
    try {
      await detenerSeguimiento();
    } catch {
      // El teléfono se detiene aunque la revocación remota necesite conexión.
    } finally {
      await borrarSesion();
      setSesion(null);
      setSeguimientoActivo(false);
      setProcesando(false);
    }
  }

  if (cargando) {
    return <PantallaCarga />;
  }

  const paddingHorizontal = compacto ? espacios.md : espacios.xl;

  return (
    <View style={styles.pantalla}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.contenido,
            {
              paddingBottom: Math.max(insets.bottom, espacios.md) + espacios.lg,
              paddingHorizontal,
              paddingTop: Math.max(insets.top, espacios.md) +
                (compacto ? espacios.sm : espacios.lg),
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.columna}>
            <View style={[styles.marca, compacto && styles.marcaCompacta]}>
              <Text style={styles.marcaEyebrow}>COMERCIA</Text>
              <Text style={[styles.titulo, compacto && styles.tituloCompacto]}>
                Trabajo de campo
              </Text>
              <Text style={styles.subtitulo}>
                Ubicación segura, incluso cuando te quedás sin señal.
              </Text>
            </View>

            {sesion ? (
              <PanelSeguimiento
                sesion={sesion}
                activo={seguimientoActivo}
                procesando={procesando}
                sincronizando={sincronizando}
                enLinea={enLinea}
                pendientes={pendientes}
                alCambiar={cambiarSeguimiento}
                alCerrar={cerrarSesion}
              />
            ) : (
              <PanelLogin
                identificador={identificador}
                password={password}
                procesando={procesando}
                estadoSim={estadoSim}
                alCambiarIdentificador={setIdentificador}
                alCambiarPassword={setPassword}
                alIngresar={iniciarSesion}
              />
            )}

            {error ? (
              <View accessibilityLiveRegion="assertive" style={styles.error}>
                <Text style={styles.errorTitulo}>No se pudo completar</Text>
                <Text style={styles.errorTexto}>{error}</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function PantallaCarga() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.pantalla,
        styles.centrado,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <StatusBar style="light" />
      <ActivityIndicator color={colores.acento} size="large" />
      <Text style={styles.cargandoTitulo}>Preparando tu cuenta</Text>
      <Text style={styles.cargandoTexto}>
        Comprobando la sesión y la SIM de este teléfono…
      </Text>
    </View>
  );
}

function PanelLogin({
  identificador,
  password,
  procesando,
  estadoSim,
  alCambiarIdentificador,
  alCambiarPassword,
  alIngresar,
}: {
  identificador: string;
  password: string;
  procesando: boolean;
  estadoSim: string;
  alCambiarIdentificador: (valor: string) => void;
  alCambiarPassword: (valor: string) => void;
  alIngresar: () => void;
}) {
  return (
    <View style={styles.tarjeta}>
      <View>
        <Text style={styles.encabezadoTarjeta}>Ingresá a Comercia</Text>
        <Text style={styles.descripcion}>
          Si Android comparte el número de tu SIM y coincide con tu cuenta, el
          ingreso ocurre automáticamente. Las credenciales quedan como respaldo.
        </Text>
      </View>

      <View style={styles.estadoSim}>
        <View style={styles.puntoInformativo} />
        <Text style={styles.estadoSimTexto}>{estadoSim}</Text>
      </View>

      <View style={styles.formulario}>
        <View style={styles.campo}>
          <Text style={styles.etiqueta}>Correo o usuario</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect={false}
            editable={!procesando}
            keyboardType="email-address"
            onChangeText={alCambiarIdentificador}
            placeholder="usuario@empresa.com"
            placeholderTextColor={colores.textoPlaceholder}
            returnKeyType="next"
            style={styles.input}
            value={identificador}
          />
        </View>
        <View style={styles.campo}>
          <Text style={styles.etiqueta}>Contraseña</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!procesando}
            onChangeText={alCambiarPassword}
            onSubmitEditing={alIngresar}
            placeholder="Tu contraseña"
            placeholderTextColor={colores.textoPlaceholder}
            returnKeyType="go"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>
      </View>

      <Boton
        etiqueta={procesando ? "Ingresando…" : "Ingresar"}
        deshabilitado={procesando}
        onPress={alIngresar}
      />
    </View>
  );
}

function PanelSeguimiento({
  sesion,
  activo,
  procesando,
  sincronizando,
  enLinea,
  pendientes,
  alCambiar,
  alCerrar,
}: {
  sesion: SesionMovil;
  activo: boolean;
  procesando: boolean;
  sincronizando: boolean;
  enLinea: boolean | null;
  pendientes: number;
  alCambiar: () => void;
  alCerrar: () => void;
}) {
  const nombre = `${sesion.usuario.nombre} ${sesion.usuario.apellido}`.trim();
  const sinInternet = enLinea === false;
  const tituloSincronizacion = sinInternet
    ? "Sin conexión"
    : sincronizando
      ? "Sincronizando"
      : pendientes > 0
        ? `${pendientes} por enviar`
        : "Ubicaciones al día";
  const detalleSincronizacion = sinInternet
    ? pendientes > 0
      ? `${pendientes} ubicación${pendientes === 1 ? "" : "es"} guardada${pendientes === 1 ? "" : "s"} en este teléfono.`
      : "Las próximas ubicaciones se guardarán en este teléfono."
    : pendientes > 0
      ? "Se enviarán automáticamente cuando el servidor responda."
      : "No hay ubicaciones pendientes de envío.";

  return (
    <View style={styles.grupoTarjetas}>
      <View style={styles.tarjeta}>
        <View style={styles.identidad}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>
              {(sesion.usuario.nombre[0] ?? "U").toUpperCase()}
              {(sesion.usuario.apellido[0] ?? "").toUpperCase()}
            </Text>
          </View>
          <View style={styles.identidadTexto}>
            <Text style={styles.saludo}>{nombre}</Text>
            <Text style={styles.empresa}>{sesion.usuario.empresa.nombre}</Text>
            <Text style={styles.celular}>{sesion.usuario.celular}</Text>
          </View>
        </View>

        <View style={styles.divisor} />

        <View style={styles.estadoPrincipal}>
          <View
            style={[
              styles.indicadorEstado,
              activo && styles.indicadorEstadoActivo,
            ]}
          />
          <View style={styles.estadoPrincipalTexto}>
            <Text style={styles.estadoTitulo}>
              {activo ? "Seguimiento activo" : "Seguimiento detenido"}
            </Text>
            <Text style={styles.estadoDetalle}>
              {activo
                ? "Guardando una ubicación aproximadamente cada 3 minutos."
                : "No se están registrando nuevas ubicaciones."}
            </Text>
          </View>
        </View>

        {!activo ? (
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>
              Al activar, Android solicitará ubicación precisa y en segundo
              plano. Siempre podés detenerla desde acá.
            </Text>
          </View>
        ) : null}

        <Boton
          variante={activo ? "peligro" : "primario"}
          etiqueta={
            procesando
              ? "Actualizando…"
              : activo
                ? "Detener seguimiento"
                : "Activar seguimiento"
          }
          deshabilitado={procesando}
          onPress={() => {
            if (activo) {
              Alert.alert(
                "¿Detener seguimiento?",
                "Dejarás de guardar nuevas ubicaciones desde este teléfono.",
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Detener", style: "destructive", onPress: alCambiar },
                ],
              );
              return;
            }
            void alCambiar();
          }}
        />
      </View>

      <View style={styles.tarjetaSecundaria}>
        <View style={styles.sincronizacionCabecera}>
          <View
            style={[
              styles.puntoRed,
              sinInternet
                ? styles.puntoRedSinConexion
                : styles.puntoRedConConexion,
            ]}
          />
          <Text style={styles.sincronizacionTitulo}>
            {tituloSincronizacion}
          </Text>
        </View>
        <Text style={styles.sincronizacionDetalle}>
          {detalleSincronizacion}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={procesando}
        hitSlop={10}
        onPress={() => void alCerrar()}
        style={({ pressed }) => [
          styles.cerrarSesion,
          pressed && styles.cerrarSesionPresionado,
        ]}
      >
        <Text style={styles.cerrarSesionTexto}>
          Cerrar sesión en este teléfono
        </Text>
      </Pressable>
    </View>
  );
}

function Boton({
  etiqueta,
  onPress,
  deshabilitado,
  variante = "primario",
}: {
  etiqueta: string;
  onPress: () => void;
  deshabilitado: boolean;
  variante?: "primario" | "peligro";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={deshabilitado}
      onPress={() => void onPress()}
      style={({ pressed }) => [
        styles.boton,
        variante === "peligro" && styles.botonPeligro,
        pressed &&
          (variante === "peligro"
            ? styles.botonPeligroPresionado
            : styles.botonPresionado),
        deshabilitado && styles.botonDeshabilitado,
      ]}
    >
      <Text style={styles.botonTexto}>{etiqueta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pantalla: { backgroundColor: colores.fondo, flex: 1 },
  centrado: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: espacios.xl,
  },
  contenido: { flexGrow: 1, justifyContent: "center" },
  columna: {
    alignSelf: "center",
    maxWidth: anchoMaximoContenido,
    width: "100%",
  },
  marca: { marginBottom: espacios.xl },
  marcaCompacta: { marginBottom: espacios.md },
  marcaEyebrow: {
    color: colores.acento,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  titulo: {
    color: colores.textoSobreOscuro,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: espacios.xs,
  },
  tituloCompacto: { fontSize: 25 },
  subtitulo: {
    color: colores.textoSobreOscuroSecundario,
    fontSize: 14,
    lineHeight: 20,
    marginTop: espacios.xs,
  },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.grande,
    gap: espacios.md,
    padding: espacios.lg,
  },
  tarjetaSecundaria: {
    backgroundColor: colores.fondoElevado,
    borderColor: colores.bordeSobreOscuro,
    borderRadius: radios.medio,
    borderWidth: 1,
    gap: espacios.xs,
    padding: espacios.md,
  },
  grupoTarjetas: { gap: espacios.sm },
  encabezadoTarjeta: {
    color: colores.texto,
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  descripcion: {
    color: colores.textoSecundario,
    fontSize: 14,
    lineHeight: 21,
    marginTop: espacios.xs,
  },
  estadoSim: {
    alignItems: "flex-start",
    backgroundColor: colores.tarjetaSuave,
    borderRadius: radios.medio,
    flexDirection: "row",
    gap: espacios.sm,
    padding: espacios.sm,
  },
  puntoInformativo: {
    backgroundColor: colores.primario,
    borderRadius: radios.redondo,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  estadoSimTexto: {
    color: colores.textoSecundario,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  formulario: { gap: espacios.sm },
  campo: { gap: espacios.xs },
  etiqueta: { color: colores.texto, fontSize: 13, fontWeight: "700" },
  input: {
    backgroundColor: colores.blanco,
    borderColor: colores.borde,
    borderRadius: radios.medio,
    borderWidth: 1,
    color: colores.texto,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: espacios.md,
    paddingVertical: 12,
  },
  boton: {
    alignItems: "center",
    backgroundColor: colores.primario,
    borderRadius: radios.medio,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: espacios.md,
    paddingVertical: espacios.sm,
  },
  botonPresionado: { backgroundColor: colores.primarioPresionado },
  botonPeligro: { backgroundColor: colores.peligro },
  botonPeligroPresionado: { backgroundColor: colores.peligroPresionado },
  botonDeshabilitado: { opacity: 0.58 },
  botonTexto: { color: colores.blanco, fontSize: 16, fontWeight: "800" },
  error: {
    backgroundColor: colores.errorFondo,
    borderRadius: radios.medio,
    gap: espacios.xxs,
    marginTop: espacios.sm,
    padding: espacios.sm,
  },
  errorTitulo: { color: colores.errorTexto, fontSize: 14, fontWeight: "800" },
  errorTexto: { color: colores.errorTexto, fontSize: 13, lineHeight: 19 },
  cargandoTitulo: {
    color: colores.textoSobreOscuro,
    fontSize: 19,
    fontWeight: "800",
    marginTop: espacios.md,
  },
  cargandoTexto: {
    color: colores.textoSobreOscuroSecundario,
    fontSize: 14,
    lineHeight: 20,
    marginTop: espacios.xs,
    textAlign: "center",
  },
  identidad: { alignItems: "center", flexDirection: "row", gap: espacios.sm },
  avatar: {
    alignItems: "center",
    backgroundColor: colores.acentoSuave,
    borderRadius: radios.redondo,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarTexto: { color: colores.exito, fontSize: 16, fontWeight: "900" },
  identidadTexto: { flex: 1 },
  saludo: { color: colores.texto, fontSize: 20, fontWeight: "800" },
  empresa: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  celular: { color: colores.texto, fontSize: 13, fontWeight: "700", marginTop: 3 },
  divisor: { backgroundColor: colores.borde, height: StyleSheet.hairlineWidth },
  estadoPrincipal: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: espacios.sm,
  },
  indicadorEstado: {
    backgroundColor: colores.inactivo,
    borderRadius: radios.redondo,
    height: 11,
    marginTop: 5,
    width: 11,
  },
  indicadorEstadoActivo: { backgroundColor: colores.exito },
  estadoPrincipalTexto: { flex: 1 },
  estadoTitulo: { color: colores.texto, fontSize: 16, fontWeight: "800" },
  estadoDetalle: {
    color: colores.textoSecundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: espacios.xxs,
  },
  aviso: {
    backgroundColor: colores.acentoSuave,
    borderRadius: radios.medio,
    padding: espacios.sm,
  },
  avisoTexto: { color: colores.textoAviso, fontSize: 13, lineHeight: 19 },
  sincronizacionCabecera: {
    alignItems: "center",
    flexDirection: "row",
    gap: espacios.xs,
  },
  puntoRed: { borderRadius: radios.redondo, height: 9, width: 9 },
  puntoRedConConexion: { backgroundColor: colores.acento },
  puntoRedSinConexion: { backgroundColor: colores.indicadorAdvertencia },
  sincronizacionTitulo: {
    color: colores.textoSobreOscuro,
    fontSize: 14,
    fontWeight: "800",
  },
  sincronizacionDetalle: {
    color: colores.textoSobreOscuroSecundario,
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 17,
  },
  cerrarSesion: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: espacios.md,
  },
  cerrarSesionPresionado: { opacity: 0.65 },
  cerrarSesionTexto: {
    color: colores.textoSobreOscuroSecundario,
    fontSize: 14,
    fontWeight: "700",
  },
});
