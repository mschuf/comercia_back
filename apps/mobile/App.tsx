/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import * as Network from "expo-network";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PanelLogin } from "./src/components/acceso/panel-login";
import { PantallaCarga } from "./src/components/acceso/pantalla-carga";
import { PanelSeguimiento } from "./src/components/acceso/panel-seguimiento";
import { PanelImpulsador } from "./src/components/impulsador/panel-impulsador";
import {
  ErrorApi,
  iniciarSesionMovil,
  iniciarSesionMovilConSim,
  obtenerUsuarioActual,
} from "./src/lib/api";
import {
  borrarSesion,
  esSesionImpulsador,
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
import { obtenerNumerosSimParaLogin } from "./src/lib/sim";
import { anchoMaximoContenido, colores, espacios, radios } from "./src/tema";

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
  const [fuentesListas, errorFuente] = useFonts({
    Manrope: require("../web/src/app/fonts/Manrope-Variable.ttf"),
  });
  if (!fuentesListas && !errorFuente) return null;

  return (
    <SafeAreaProvider>
      <Aplicacion />
    </SafeAreaProvider>
  );
}

function Aplicacion() {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const scrollLoginRef = useRef<ScrollView>(null);
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

  const actualizarPendientes = useCallback(async () => {
    const total = await cantidadUbicacionesPendientes().catch(() => 0);
    setPendientes(total);
    return total;
  }, []);

  const mostrarCampoDeLogin = useCallback(() => {
    requestAnimationFrame(() => {
      scrollLoginRef.current?.scrollToEnd({ animated: true });
    });
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
          const reanudado = esSesionImpulsador(sesionGuardada)
            ? await detenerSeguimiento().then(() => false)
            : await reanudarSeguimiento();
          if (!montada) return;
          setSeguimientoActivo(reanudado || (await estaSeguimientoActivo()));
          await actualizarPendientes();
        } else {
          const { telefonos } = await obtenerNumerosSimParaLogin();
          if (!montada || telefonos.length === 0) return;

          try {
            const nuevaSesion = await iniciarSesionMovilConSim(telefonos);
            await guardarSesion(nuevaSesion);
            if (!montada) return;
            setSesion(nuevaSesion);
            await actualizarPendientes();
          } catch {
            // Sin coincidencia o sin señal: se muestran las credenciales.
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
        if (!montada || JSON.stringify(usuario) === JSON.stringify(sesion.usuario)) {
          return;
        }

        const sesionActualizada: SesionMovil = { ...sesion, usuario };
        await guardarSesion(sesionActualizada);
        if (!montada) return;
        setSesion((sesionVigente) =>
          sesionVigente?.token === sesion.token ? sesionActualizada : sesionVigente,
        );
      } catch (errorDePerfil) {
        if (
          montada &&
          errorDePerfil instanceof ErrorApi &&
          [401, 403].includes(errorDePerfil.status)
        ) {
          setError("La sesión venció. Iniciá sesión nuevamente.");
        }
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

    void Network.getNetworkStateAsync()
      .then(aplicarEstado)
      .catch(() => {
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

  if (cargando) return <PantallaCarga />;

  if (sesion && esSesionImpulsador(sesion)) {
    return (
      <>
        <StatusBar style="light" />
        <PanelImpulsador sesion={sesion} enLinea={enLinea} alCerrar={cerrarSesion} />
      </>
    );
  }

  const paddingHorizontal = compacto ? espacios.md : espacios.xl;

  return (
    <View style={styles.pantalla}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: "height" })}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollLoginRef}
          contentContainerStyle={[
            styles.contenido,
            {
              paddingBottom: Math.max(insets.bottom, espacios.md) + espacios.lg,
              paddingHorizontal,
              paddingTop:
                Math.max(insets.top, espacios.md) +
                (compacto ? espacios.sm : espacios.lg),
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.columna}>
            <View style={[styles.marca, compacto && styles.marcaCompacta]}>
              <Text style={styles.marcaEyebrow}>COMERCIA</Text>
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
                alCambiarIdentificador={setIdentificador}
                alCambiarPassword={setPassword}
                alEnfocarCampo={mostrarCampoDeLogin}
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pantalla: { backgroundColor: colores.fondoElevado, flex: 1 },
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
  error: {
    backgroundColor: colores.errorFondo,
    borderRadius: radios.medio,
    gap: espacios.xxs,
    marginTop: espacios.sm,
    padding: espacios.sm,
  },
  errorTitulo: { color: colores.errorTexto, fontSize: 14, fontWeight: "800" },
  errorTexto: { color: colores.errorTexto, fontSize: 13, lineHeight: 19 },
});
