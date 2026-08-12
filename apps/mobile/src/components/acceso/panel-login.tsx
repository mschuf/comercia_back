import { StyleSheet, Text, TextInput, View } from "react-native";
import { colores, espacios, radios } from "../../tema";
import { Boton } from "../ui/boton";

export function PanelLogin({
  identificador,
  password,
  procesando,
  alCambiarIdentificador,
  alCambiarPassword,
  alEnfocarCampo,
  alIngresar,
}: {
  identificador: string;
  password: string;
  procesando: boolean;
  alCambiarIdentificador: (valor: string) => void;
  alCambiarPassword: (valor: string) => void;
  alEnfocarCampo: () => void;
  alIngresar: () => void;
}) {
  return (
    <View style={styles.tarjeta}>
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
            onFocus={alEnfocarCampo}
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
            onFocus={alEnfocarCampo}
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

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.grande,
    gap: espacios.md,
    padding: espacios.lg,
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
});
