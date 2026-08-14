import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colores, espacios, radios } from "../tema";
import type { ToastMovilItem } from "../types/toast";

const CONFIGURACION = {
  exito: {
    color: colores.exito,
    fondo: colores.tarjetaSuave,
    icono: "checkmark-circle" as const,
    duracion: 5_000,
  },
  advertencia: {
    color: colores.advertencia,
    fondo: colores.advertenciaSuave,
    icono: "alert-circle" as const,
    duracion: 6_000,
  },
  error: {
    color: colores.errorTexto,
    fondo: colores.errorFondo,
    icono: "close-circle" as const,
    duracion: 8_000,
  },
};

export function ToastMovil({
  toast,
  arriba,
  alCerrar,
}: {
  toast: ToastMovilItem;
  arriba: number;
  alCerrar: () => void;
}) {
  const configuracion = CONFIGURACION[toast.tipo];

  useEffect(() => {
    const temporizador = setTimeout(alCerrar, configuracion.duracion);
    return () => clearTimeout(temporizador);
  }, [alCerrar, configuracion.duracion, toast.id]);

  return (
    <View pointerEvents="box-none" style={[styles.contenedor, { top: arriba }]}>
      <View
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: configuracion.fondo }]}
      >
        <Ionicons color={configuracion.color} name={configuracion.icono} size={22} />
        <View style={styles.contenido}>
          <Text style={[styles.titulo, { color: configuracion.color }]}>{toast.titulo}</Text>
          {toast.detalle ? <Text style={styles.detalle}>{toast.detalle}</Text> : null}
        </View>
        <Pressable
          accessibilityLabel="Cerrar aviso"
          hitSlop={8}
          onPress={alCerrar}
          style={({ pressed }) => [styles.cerrar, pressed && styles.presionado]}
        >
          <Ionicons color={configuracion.color} name="close" size={19} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    left: espacios.md,
    position: "absolute",
    right: espacios.md,
    zIndex: 20,
  },
  toast: {
    alignItems: "flex-start",
    alignSelf: "flex-end",
    borderRadius: radios.medio,
    elevation: 6,
    flexDirection: "row",
    gap: espacios.sm,
    maxWidth: 380,
    padding: espacios.md,
    shadowColor: "#173A38",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  contenido: { flex: 1, gap: espacios.xxs, minWidth: 0 },
  titulo: { fontSize: 14, fontWeight: "900", lineHeight: 20 },
  detalle: { color: colores.textoSecundario, fontSize: 13, lineHeight: 18 },
  cerrar: { alignItems: "center", justifyContent: "center", minHeight: 24, minWidth: 24 },
  presionado: { opacity: 0.65 },
});
