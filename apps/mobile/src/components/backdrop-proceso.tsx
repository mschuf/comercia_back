import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colores, espacios } from "../tema";

export function BackdropProceso({
  visible,
  titulo,
  detalle,
}: {
  visible: boolean;
  titulo: string;
  detalle?: string;
}) {
  if (!visible) return null;

  return (
    <View
      accessibilityLiveRegion="assertive"
      accessibilityViewIsModal
      style={styles.backdrop}
    >
      <View style={styles.contenido}>
        <ActivityIndicator color={colores.acento} size="large" />
        <Text style={styles.titulo}>{titulo}</Text>
        {detalle ? <Text style={styles.detalle}>{detalle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(16, 61, 58, 0.78)",
    bottom: 0,
    elevation: 30,
    justifyContent: "center",
    left: 0,
    padding: espacios.xl,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 30,
  },
  contenido: { alignItems: "center", gap: espacios.sm, maxWidth: 300 },
  titulo: {
    color: colores.textoSobreOscuro,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 23,
    textAlign: "center",
  },
  detalle: {
    color: colores.textoSobreOscuroSecundario,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
