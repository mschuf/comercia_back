import { NativeModules, PermissionsAndroid, Platform } from "react-native";

type NumeroSimNativo = { slotIndex: number; number: string | null };

type ModuloSim = {
  getAvailablePhoneNumbers(): Promise<NumeroSimNativo[]>;
  requestPhoneNumberHint?(): Promise<string | null>;
};

export type DiagnosticoSim = {
  disponible: boolean;
  permisoTelefono: boolean;
  permisoNumeros: boolean;
  sims: NumeroSimNativo[];
  mensaje: string;
};

const moduloSim = NativeModules.ComerciaSimPhoneNumbers as
  | ModuloSim
  | undefined;

async function estadoPermisos(): Promise<{
  telefono: boolean;
  numeros: boolean;
}> {
  const [telefono, numeros] = await Promise.all([
    PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE),
    PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
    ),
  ]);
  return { telefono, numeros };
}

function mensajeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Android no permitió leer la información de SIM.";
}

export async function diagnosticarSim(
  solicitarPermiso: boolean,
): Promise<DiagnosticoSim> {
  if (Platform.OS !== "android") {
    return {
      disponible: false,
      permisoTelefono: false,
      permisoNumeros: false,
      sims: [],
      mensaje: "La lectura de SIM está disponible solo en Android.",
    };
  }

  if (!moduloSim) {
    return {
      disponible: false,
      permisoTelefono: false,
      permisoNumeros: false,
      sims: [],
      mensaje:
        "El módulo de SIM no está presente en esta APK. Instalá la última build.",
    };
  }

  let permisos = await estadoPermisos();
  if ((!permisos.telefono || !permisos.numeros) && solicitarPermiso) {
    const resultado = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
    ]);
    permisos = {
      telefono:
        resultado[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] ===
        PermissionsAndroid.RESULTS.GRANTED,
      numeros:
        resultado[PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS] ===
        PermissionsAndroid.RESULTS.GRANTED,
    };
  }

  if (!permisos.telefono || !permisos.numeros) {
    return {
      disponible: true,
      permisoTelefono: permisos.telefono,
      permisoNumeros: permisos.numeros,
      sims: [],
      mensaje:
        "Falta permiso para leer el estado o el número de teléfono de la SIM.",
    };
  }

  try {
    const sims = (await moduloSim.getAvailablePhoneNumbers()).map((sim) => ({
      slotIndex: sim.slotIndex,
      number: sim.number?.trim() || null,
    }));
    const conNumero = sims.filter((sim) => sim.number).length;
    return {
      disponible: true,
      permisoTelefono: true,
      permisoNumeros: true,
      sims,
      mensaje:
        sims.length === 0
          ? "Android no informó ninguna SIM activa."
          : `${sims.length} SIM activa(s); ${conNumero} con número disponible.`,
    };
  } catch (error) {
    return {
      disponible: true,
      permisoTelefono: permisos.telefono,
      permisoNumeros: permisos.numeros,
      sims: [],
      mensaje: `No se pudo consultar la SIM: ${mensajeError(error)}`,
    };
  }
}

export async function leerNumerosSim(
  solicitarPermiso: boolean,
): Promise<string[]> {
  const diagnostico = await diagnosticarSim(solicitarPermiso);
  return [
    ...new Set(
      diagnostico.sims
        .map((sim) => sim.number)
        .filter((numero): numero is string => Boolean(numero)),
    ),
  ];
}

export async function obtenerNumerosSimParaLogin(): Promise<{
  telefonos: string[];
  mensaje: string;
}> {
  const diagnostico = await diagnosticarSim(true);
  const telefonosSilenciosos = [
    ...new Set(
      diagnostico.sims
        .map((sim) => sim.number)
        .filter((numero): numero is string => Boolean(numero)),
    ),
  ];
  if (telefonosSilenciosos.length > 0) {
    return {
      telefonos: telefonosSilenciosos,
      mensaje: "Android reconoció el número de la SIM.",
    };
  }

  if (!moduloSim?.requestPhoneNumberHint) {
    return { telefonos: [], mensaje: diagnostico.mensaje };
  }

  try {
    const numeroSeleccionado = (
      await moduloSim.requestPhoneNumberHint()
    )?.trim();
    if (!numeroSeleccionado) {
      return {
        telefonos: [],
        mensaje:
          "No se seleccionó ningún número SIM. Podés ingresar con tus credenciales.",
      };
    }
    return {
      telefonos: [numeroSeleccionado],
      mensaje: "Android confirmó el número de la SIM.",
    };
  } catch (error) {
    return {
      telefonos: [],
      mensaje: `${diagnostico.mensaje} ${mensajeError(error)}`,
    };
  }
}

export function puedeLeerSimEnEsteDispositivo(): boolean {
  return Platform.OS === "android" && moduloSim !== undefined;
}
