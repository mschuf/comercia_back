import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ErrorApi,
  iniciarSesionMovil,
  iniciarSesionMovilConSim,
} from "./src/lib/api";
import {
  borrarSesion,
  guardarSesion,
  obtenerSesion,
  type SesionMovil,
} from "./src/lib/sesion";
import {
  activarSeguimiento,
  detenerSeguimiento,
  estaSeguimientoActivo,
  reanudarSeguimiento,
} from "./src/lib/seguimiento";
import {
  diagnosticarSim,
  puedeLeerSimEnEsteDispositivo,
  type DiagnosticoSim,
} from "./src/lib/sim";

function textoError(error: unknown): string {
  if (error instanceof ErrorApi || error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

export default function App() {
  const [sesion, setSesion] = useState<SesionMovil | null>(null);
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [seguimientoActivo, setSeguimientoActivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticoSim, setDiagnosticoSim] =
    useState<DiagnosticoSim | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const sesionGuardada = await obtenerSesion();
        if (sesionGuardada) {
          setSesion(sesionGuardada);
          const reanudado = await reanudarSeguimiento();
          setSeguimientoActivo(reanudado || (await estaSeguimientoActivo()));
        } else {
          await intentarInicioConSim(false);
        }
      } catch (errorDeInicio) {
        setError(textoError(errorDeInicio));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function intentarInicioConSim(
    solicitarPermiso: boolean,
  ): Promise<boolean> {
    const lectura = await diagnosticarSim(solicitarPermiso);
    if (solicitarPermiso) setDiagnosticoSim(lectura);
    const telefonos = [
      ...new Set(
        lectura.sims
          .map((sim) => sim.number)
          .filter((numero): numero is string => Boolean(numero)),
      ),
    ];
    if (telefonos.length === 0) return false;

    const nuevaSesion = await iniciarSesionMovilConSim(telefonos);
    await guardarSesion(nuevaSesion);
    setSesion(nuevaSesion);
    return true;
  }

  async function iniciarConSim() {
    setProcesando(true);
    setError(null);
    try {
      const inicioExitoso = await intentarInicioConSim(true);
      if (!inicioExitoso) {
        setError(
          "No se pudo leer un número de las SIM. Ingresá con correo o usuario y contraseña.",
        );
      }
    } catch (errorDeSim) {
      setError(textoError(errorDeSim));
    } finally {
      setProcesando(false);
    }
  }

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
      // Detener en el teléfono es prioritario; la revocación remota puede
      // requerir conexión y se informa después si vuelve a iniciar sesión.
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", default: undefined })}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.contenido}>
          <View style={styles.marca}>
            <Text style={styles.marcaEyebrow}>COMERCIA</Text>
            <Text style={styles.titulo}>Seguimiento de campo</Text>
          </View>

          {sesion ? (
            <PanelSeguimiento
              sesion={sesion}
              activo={seguimientoActivo}
              procesando={procesando}
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
              alIngresar={iniciarSesion}
              puedeLeerSim={puedeLeerSimEnEsteDispositivo()}
              diagnosticoSim={diagnosticoSim}
              alIniciarConSim={iniciarConSim}
            />
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PantallaCarga() {
  return (
    <SafeAreaView style={[styles.safeArea, styles.centrado]}>
      <StatusBar style="light" />
      <ActivityIndicator color="#43D4A0" size="large" />
      <Text style={styles.cargandoTexto}>Comprobando sesión segura…</Text>
    </SafeAreaView>
  );
}

function PanelLogin({
  identificador,
  password,
  procesando,
  alCambiarIdentificador,
  alCambiarPassword,
  alIngresar,
  puedeLeerSim,
  diagnosticoSim,
  alIniciarConSim,
}: {
  identificador: string;
  password: string;
  procesando: boolean;
  alCambiarIdentificador: (valor: string) => void;
  alCambiarPassword: (valor: string) => void;
  alIngresar: () => void;
  puedeLeerSim: boolean;
  diagnosticoSim: DiagnosticoSim | null;
  alIniciarConSim: () => void;
}) {
  return (
    <View style={styles.tarjeta}>
      <Text style={styles.encabezadoTarjeta}>Ingresá a tu cuenta</Text>
      <Text style={styles.descripcion}>
        La aplicación intenta usar el número disponible en tu SIM Android si
        autorizás el permiso. Si no está disponible, usá tus credenciales de
        Comercia. La sesión se conserva cifrada en este teléfono.
      </Text>
      {puedeLeerSim ? (
        <>
          <View style={styles.simAviso}>
            <Text style={styles.simAvisoTexto}>
              Solo se leerán los números que Android exponga para SIM 1 y SIM 2,
              exclusivamente para intentar iniciar tu sesión.
            </Text>
          </View>
          <Boton
            etiqueta={
              procesando ? "Comprobando SIM…" : "Continuar con número de SIM"
            }
            deshabilitado={procesando}
            onPress={alIniciarConSim}
          />
          {diagnosticoSim ? (
            <View style={styles.simDiagnostico}>
              <Text style={styles.simDiagnosticoTitulo}>
                Diagnóstico de SIM (solo visible en este teléfono)
              </Text>
              <Text style={styles.simDiagnosticoTexto}>
                {diagnosticoSim.mensaje}
              </Text>
              <Text style={styles.simDiagnosticoTexto}>
                Permiso de teléfono: {diagnosticoSim.permisoTelefono ? "concedido" : "no concedido"}. Permiso de números: {diagnosticoSim.permisoNumeros ? "concedido" : "no concedido"}.
              </Text>
              {diagnosticoSim.sims.map((sim) => (
                <Text key={sim.slotIndex} style={styles.simNumero}>
                  SIM {sim.slotIndex}: {sim.number ?? "Android no expone un número"}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={styles.separador}>o ingresá tus credenciales</Text>
        </>
      ) : null}
      <Text style={styles.etiqueta}>Correo o usuario</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={!procesando}
        keyboardType="email-address"
        onChangeText={alCambiarIdentificador}
        placeholder="usuario@empresa.com"
        placeholderTextColor="#79909D"
        style={styles.input}
        value={identificador}
      />
      <Text style={styles.etiqueta}>Contraseña</Text>
      <TextInput
        autoCapitalize="none"
        editable={!procesando}
        onChangeText={alCambiarPassword}
        onSubmitEditing={alIngresar}
        placeholder="Tu contraseña"
        placeholderTextColor="#79909D"
        secureTextEntry
        style={styles.input}
        value={password}
      />
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
  alCambiar,
  alCerrar,
}: {
  sesion: SesionMovil;
  activo: boolean;
  procesando: boolean;
  alCambiar: () => void;
  alCerrar: () => void;
}) {
  const nombre = `${sesion.usuario.nombre} ${sesion.usuario.apellido}`.trim();
  const etiquetaAccion = activo ? "Detener seguimiento" : "Activar seguimiento";

  return (
    <View style={styles.tarjeta}>
      <Text style={styles.saludo}>Hola, {nombre}</Text>
      <Text style={styles.empresa}>{sesion.usuario.empresa.nombre}</Text>
      <View style={styles.estadoFila}>
        <View style={[styles.puntoEstado, activo && styles.puntoActivo]} />
        <Text style={styles.estadoTexto}>
          {activo ? "Seguimiento activo" : "Seguimiento detenido"}
        </Text>
      </View>
      <Text style={styles.descripcion}>
        Al activarlo, Comercia recibe tu latitud, longitud, precisión y hora
        aproximadamente cada minuto, junto a los datos de tu cuenta. Android
        muestra una notificación y podés detenerlo desde esta pantalla.
      </Text>
      {!activo ? (
        <Text style={styles.aviso}>
          Al continuar confirmás que entendés este uso y permitirás ubicación
          precisa y en segundo plano cuando el sistema lo solicite.
        </Text>
      ) : null}
      <Boton
        variante={activo ? "peligro" : "primario"}
        etiqueta={procesando ? "Actualizando…" : etiquetaAccion}
        deshabilitado={procesando}
        onPress={() => {
          if (activo) {
            Alert.alert(
              "¿Detener seguimiento?",
              "Dejarás de enviar nuevas ubicaciones desde este teléfono.",
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
      <Pressable disabled={procesando} onPress={() => void alCerrar()}>
        <Text style={styles.cerrarSesion}>Cerrar sesión en este teléfono</Text>
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
      disabled={deshabilitado}
      onPress={() => void onPress()}
      style={({ pressed }) => [
        styles.boton,
        variante === "peligro" && styles.botonPeligro,
        (deshabilitado || pressed) && styles.botonAtenuado,
      ]}
    >
      <Text style={styles.botonTexto}>{etiqueta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#06212D" },
  flex: { flex: 1 },
  centrado: { alignItems: "center", justifyContent: "center" },
  contenido: { flexGrow: 1, justifyContent: "center", padding: 24 },
  marca: { marginBottom: 30 },
  marcaEyebrow: {
    color: "#43D4A0",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.2,
  },
  titulo: { color: "#F7FBFC", fontSize: 31, fontWeight: "800", marginTop: 6 },
  tarjeta: {
    backgroundColor: "#F7FBFC",
    borderRadius: 24,
    gap: 12,
    padding: 22,
  },
  encabezadoTarjeta: { color: "#102E3C", fontSize: 23, fontWeight: "800" },
  descripcion: { color: "#45606E", fontSize: 15, lineHeight: 22 },
  etiqueta: {
    color: "#244552",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  input: {
    borderColor: "#C9D6DB",
    borderRadius: 12,
    borderWidth: 1,
    color: "#102E3C",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  boton: {
    alignItems: "center",
    backgroundColor: "#087E8B",
    borderRadius: 12,
    marginTop: 10,
    padding: 15,
  },
  botonPeligro: { backgroundColor: "#B84A48" },
  botonAtenuado: { opacity: 0.65 },
  botonTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  error: {
    color: "#FFD3CE",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 18,
    textAlign: "center",
  },
  cargandoTexto: { color: "#D8E9EC", marginTop: 16 },
  saludo: { color: "#102E3C", fontSize: 24, fontWeight: "800" },
  empresa: { color: "#54717D", fontSize: 15, marginTop: -8 },
  estadoFila: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  puntoEstado: {
    backgroundColor: "#9BADB4",
    borderRadius: 99,
    height: 9,
    width: 9,
  },
  puntoActivo: { backgroundColor: "#24A878" },
  estadoTexto: { color: "#244552", fontSize: 15, fontWeight: "800" },
  aviso: {
    backgroundColor: "#E3F4F0",
    borderRadius: 12,
    color: "#245B52",
    fontSize: 14,
    lineHeight: 20,
    padding: 13,
  },
  simAviso: {
    backgroundColor: "#EEF6FA",
    borderRadius: 12,
    marginTop: 4,
    padding: 13,
  },
  simAvisoTexto: { color: "#27566B", fontSize: 14, lineHeight: 20 },
  simDiagnostico: {
    backgroundColor: "#EAF7F2",
    borderColor: "#B9E6D5",
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  simDiagnosticoTitulo: { color: "#145647", fontSize: 13, fontWeight: "800" },
  simDiagnosticoTexto: { color: "#2D6258", fontSize: 13, lineHeight: 19 },
  simNumero: { color: "#102E3C", fontSize: 14, fontWeight: "700" },
  separador: {
    color: "#647A84",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
  },
  cerrarSesion: {
    color: "#45606E",
    fontSize: 14,
    fontWeight: "700",
    paddingTop: 10,
    textAlign: "center",
  },
});
