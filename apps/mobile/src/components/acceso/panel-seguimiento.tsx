import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { SesionMovil } from "../../lib/sesion";
import { colores, espacios, fuentes, radios } from "../../tema";
import { Boton } from "../ui/boton";

export function PanelSeguimiento({
  sesion,
  activo,
  procesando,
  sincronizando,
  enLinea,
  pendientes,
  alCambiar,
  alCerrar,
}: {
  sesion: SesionMovil;
  activo: boolean;
  procesando: boolean;
  sincronizando: boolean;
  enLinea: boolean | null;
  pendientes: number;
  alCambiar: () => void;
  alCerrar: () => void;
}) {
  const nombre = `${sesion.usuario.nombre} ${sesion.usuario.apellido}`.trim();
  const sinInternet = enLinea === false;
  const tituloSincronizacion = sinInternet
    ? "Sin conexión"
    : sincronizando
      ? "Sincronizando"
      : pendientes > 0
        ? `${pendientes} por enviar`
        : "Ubicaciones al día";
  const detalleSincronizacion = sinInternet
    ? pendientes > 0
      ? `${pendientes} ubicación${pendientes === 1 ? "" : "es"} guardada${pendientes === 1 ? "" : "s"} en este teléfono.`
      : "Las próximas ubicaciones se guardarán en este teléfono."
    : pendientes > 0
      ? "Se enviarán automáticamente cuando el servidor responda."
      : "No hay ubicaciones pendientes de envío.";

  return (
    <View style={styles.grupoTarjetas}>
      <View style={styles.tarjeta}>
        <View style={styles.identidad}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>
              {(sesion.usuario.nombre[0] ?? "U").toUpperCase()}
              {(sesion.usuario.apellido[0] ?? "").toUpperCase()}
            </Text>
          </View>
          <View style={styles.identidadTexto}>
            <Text style={styles.saludo}>{nombre}</Text>
            <Text style={styles.empresa}>{sesion.usuario.empresa.nombre}</Text>
            <Text style={styles.celular}>{sesion.usuario.celular}</Text>
          </View>
        </View>

        <View style={styles.divisor} />

        <View style={styles.estadoPrincipal}>
          <View
            style={[
              styles.indicadorEstado,
              activo && styles.indicadorEstadoActivo,
            ]}
          />
          <View style={styles.estadoPrincipalTexto}>
            <Text style={styles.estadoTitulo}>
              {activo ? "Seguimiento activo" : "Seguimiento detenido"}
            </Text>
            <Text style={styles.estadoDetalle}>
              {activo
                ? "Guardando una ubicación aproximadamente cada 3 minutos."
                : "No se están registrando nuevas ubicaciones."}
            </Text>
          </View>
        </View>

        {!activo ? (
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>
              Al activar, Android solicitará ubicación precisa y en segundo
              plano. Siempre podés detenerla desde acá.
            </Text>
          </View>
        ) : null}

        <Boton
          variante={activo ? "peligro" : "primario"}
          etiqueta={
            procesando
              ? "Actualizando…"
              : activo
                ? "Detener seguimiento"
                : "Activar seguimiento"
          }
          deshabilitado={procesando}
          onPress={() => {
            if (activo) {
              Alert.alert(
                "¿Detener seguimiento?",
                "Dejarás de guardar nuevas ubicaciones desde este teléfono.",
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Detener", style: "destructive", onPress: alCambiar },
                ],
              );
              return;
            }
            alCambiar();
          }}
        />
      </View>

      <View style={styles.tarjetaSecundaria}>
        <View style={styles.sincronizacionCabecera}>
          <View
            style={[
              styles.puntoRed,
              sinInternet
                ? styles.puntoRedSinConexion
                : styles.puntoRedConConexion,
            ]}
          />
          <Text style={styles.sincronizacionTitulo}>{tituloSincronizacion}</Text>
        </View>
        <Text style={styles.sincronizacionDetalle}>{detalleSincronizacion}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={procesando}
        hitSlop={10}
        onPress={alCerrar}
        style={({ pressed }) => [
          styles.cerrarSesion,
          pressed && styles.cerrarSesionPresionado,
        ]}
      >
        <Text style={styles.cerrarSesionTexto}>
          Cerrar sesión en este teléfono
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grupoTarjetas: { gap: espacios.sm },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.grande,
    gap: espacios.md,
    padding: espacios.lg,
  },
  tarjetaSecundaria: {
    backgroundColor: colores.fondoElevado,
    borderColor: colores.bordeSobreOscuro,
    borderRadius: radios.medio,
    borderWidth: 1,
    gap: espacios.xs,
    padding: espacios.md,
  },
  identidad: { alignItems: "center", flexDirection: "row", gap: espacios.sm },
  avatar: {
    alignItems: "center",
    backgroundColor: colores.acentoSuave,
    borderRadius: radios.redondo,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  avatarTexto: { color: colores.exito, fontSize: 16, fontWeight: "900" },
  identidadTexto: { flex: 1 },
  saludo: {
    color: colores.texto,
    fontFamily: fuentes.titulos,
    fontSize: 20,
    fontWeight: "800",
  },
  empresa: { color: colores.textoSecundario, fontSize: 13, marginTop: 2 },
  celular: {
    color: colores.texto,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  divisor: { backgroundColor: colores.borde, height: StyleSheet.hairlineWidth },
  estadoPrincipal: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: espacios.sm,
  },
  indicadorEstado: {
    backgroundColor: colores.inactivo,
    borderRadius: radios.redondo,
    height: 11,
    marginTop: 5,
    width: 11,
  },
  indicadorEstadoActivo: { backgroundColor: colores.exito },
  estadoPrincipalTexto: { flex: 1 },
  estadoTitulo: { color: colores.texto, fontSize: 16, fontWeight: "800" },
  estadoDetalle: {
    color: colores.textoSecundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: espacios.xxs,
  },
  aviso: {
    backgroundColor: colores.acentoSuave,
    borderRadius: radios.medio,
    padding: espacios.sm,
  },
  avisoTexto: { color: colores.textoAviso, fontSize: 13, lineHeight: 19 },
  sincronizacionCabecera: {
    alignItems: "center",
    flexDirection: "row",
    gap: espacios.xs,
  },
  puntoRed: { borderRadius: radios.redondo, height: 9, width: 9 },
  puntoRedConConexion: { backgroundColor: colores.acento },
  puntoRedSinConexion: { backgroundColor: colores.indicadorAdvertencia },
  sincronizacionTitulo: {
    color: colores.textoSobreOscuro,
    fontSize: 14,
    fontWeight: "800",
  },
  sincronizacionDetalle: {
    color: colores.textoSobreOscuroSecundario,
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 17,
  },
  cerrarSesion: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: espacios.md,
  },
  cerrarSesionPresionado: { opacity: 0.65 },
  cerrarSesionTexto: {
    color: colores.textoSobreOscuroSecundario,
    fontSize: 14,
    fontWeight: "700",
  },
});
