import { Pressable, StyleSheet, Text } from "react-native";
import { colores, espacios, radios } from "../../tema";

export function Boton({
  etiqueta,
  onPress,
  deshabilitado,
  variante = "primario",
}: {
  etiqueta: string;
  onPress: () => void | Promise<void>;
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
});
