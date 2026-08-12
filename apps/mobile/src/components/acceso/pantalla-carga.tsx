import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colores, espacios } from "../../tema";

export function PantallaCarga() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.pantalla,
        { paddingBottom: insets.bottom, paddingTop: insets.top },
      ]}
    >
      <StatusBar style="light" />
      <ActivityIndicator color={colores.acento} size="large" />
      <Text style={styles.titulo}>Preparando tu cuenta</Text>
      <Text style={styles.descripcion}>
        Comprobando la sesión y la SIM de este teléfono…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    alignItems: "center",
    backgroundColor: colores.fondoElevado,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: espacios.xl,
  },
  titulo: {
    color: colores.textoSobreOscuro,
    fontSize: 19,
    fontWeight: "800",
    marginTop: espacios.md,
  },
  descripcion: {
    color: colores.textoSobreOscuroSecundario,
    fontSize: 14,
    lineHeight: 20,
    marginTop: espacios.xs,
    textAlign: "center",
  },
});
