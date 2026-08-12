import { useRef } from "react";
import { ImageBackground, StyleSheet, Text, TextInput, View } from "react-native";
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
  const referenciaPassword = useRef<TextInput>(null);

  return (
    <View style={styles.tarjeta}>
      <ImageBackground
        accessibilityLabel="Repositor preparando tareas en un local"
        imageStyle={styles.imagenCabeceraImagen}
        source={require("../../../assets/repositor-comercial-hero.png")}
        style={styles.imagenCabecera}
      >
        <View style={styles.imagenVelo} />
        <View style={styles.marcaTexto}>
          <Text style={styles.marcaTitulo}>Comercia</Text>
          <Text style={styles.marcaDetalle}>Tu jornada, tus locales y tus tareas</Text>
        </View>
      </ImageBackground>
      <View style={styles.formulario}>
        <View style={styles.campo}>
          <Text style={styles.etiqueta}>Correo o usuario</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect={false}
            blurOnSubmit={false}
            editable={!procesando}
            keyboardType="email-address"
            onChangeText={alCambiarIdentificador}
            onFocus={alEnfocarCampo}
            onSubmitEditing={() => {
              requestAnimationFrame(() => referenciaPassword.current?.focus());
            }}
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
            ref={referenciaPassword}
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
  imagenCabecera: {
    borderRadius: radios.medio,
    height: 174,
    justifyContent: "flex-end",
    overflow: "hidden",
    padding: espacios.md,
  },
  imagenCabeceraImagen: { resizeMode: "cover" },
  imagenVelo: {
    backgroundColor: "rgba(3, 43, 43, 0.42)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  marcaTexto: { gap: espacios.xxs },
  marcaTitulo: { color: colores.blanco, fontSize: 25, fontWeight: "900" },
  marcaDetalle: { color: colores.acentoSuave, fontSize: 13, fontWeight: "800" },
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
