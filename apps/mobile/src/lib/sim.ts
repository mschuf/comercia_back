import { NativeModules, PermissionsAndroid, Platform } from "react-native";

type NumeroSimNativo = { slotIndex: number; number: string };

type ModuloSim = {
  getAvailablePhoneNumbers(): Promise<NumeroSimNativo[]>;
};

const moduloSim = NativeModules.ComerciaSimPhoneNumbers as
  ModuloSim | undefined;

async function permisosConcedidos(): Promise<boolean> {
  const permisos = [
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
  ];
  const estados = await Promise.all(
    permisos.map((permiso) => PermissionsAndroid.check(permiso)),
  );
  return estados.every(Boolean);
}

export async function leerNumerosSim(
  solicitarPermiso: boolean,
): Promise<string[]> {
  if (Platform.OS !== "android" || !moduloSim) return [];

  if (!(await permisosConcedidos())) {
    if (!solicitarPermiso) return [];
    const resultado = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
    ]);
    const permitido = Object.values(resultado).every(
      (estado) => estado === PermissionsAndroid.RESULTS.GRANTED,
    );
    if (!permitido) return [];
  }

  const numeros = await moduloSim.getAvailablePhoneNumbers();
  return [
    ...new Set(
      numeros
        .map(({ number }) => number.trim())
        .filter((numero) => numero.length > 0),
    ),
  ];
}

export function puedeLeerSimEnEsteDispositivo(): boolean {
  return Platform.OS === "android" && moduloSim !== undefined;
}
