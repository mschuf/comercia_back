import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import type {
  MarcacionResumen,
  RendimientoImpulsador,
  RespuestaPaginada,
  TareaVisita,
  Visita,
  VisitaHoy,
} from "../../types/impulsador";
import { colores, espacios, fuentes, radios } from "../../tema";
import { fechaHora } from "./utils";

function TituloPantalla({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <View style={styles.tituloPantalla}>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.descripcion}>{detalle}</Text>
    </View>
  );
}

export function HomeView({
  datos,
  nombre,
  agenda,
}: {
  datos: RendimientoImpulsador | null;
  nombre: string;
  agenda: VisitaHoy[];
}) {
  const proximo = agenda[0];
  const porcentajePresentaciones = new Intl.NumberFormat("es-PY", {
    maximumFractionDigits: 1,
  }).format(datos?.presentacionesPorcentaje ?? 0);
  return (
    <View style={styles.seccion}>
      <View style={styles.heroHome}>
        <View style={styles.heroTexto}>
          <Text style={styles.heroEyebrow}>COMERCIA CAMPO</Text>
          <Text style={styles.heroTitulo}>Hola, {nombre}</Text>
          <Text style={styles.heroDetalle}>
            {proximo
              ? `Próximo local: ${proximo.local.nombre}`
              : "Tu jornada está lista para comenzar."}
          </Text>
        </View>
        <Image
          accessibilityLabel="Repositor verificando tareas en un local"
          accessibilityIgnoresInvertColors
          source={require("../../../assets/repositor-comercial-hero.png")}
          style={styles.heroImagen}
        />
        <View pointerEvents="none" style={styles.heroImagenVelo} />
      </View>

      {datos ? (
        <View style={styles.kpisHome}>
          <View style={[styles.kpiHome, styles.kpiPresentaciones]}>
            <Ionicons color={colores.acentoSuave} name="calendar" size={22} />
            <Text style={styles.kpiHomeTituloClaro}>Presentaciones</Text>
            <Text style={styles.kpiHomeValorClaro}>
              {datos.presentacionesRealizadas}/{datos.presentacionesProgramadas}
            </Text>
            <Text style={styles.kpiHomeDetalleClaro}>visitas realizadas hoy</Text>
            <View style={styles.porcentajePresentaciones}>
              <Text style={styles.porcentajePresentacionesTexto}>{porcentajePresentaciones}% completado</Text>
            </View>
          </View>
          <View style={[styles.kpiHome, styles.kpiLocales]}>
            <Ionicons color={colores.advertencia} name="storefront" size={22} />
            <Text style={styles.kpiHomeTitulo}>Locales</Text>
            <Text style={styles.kpiHomeValor}>
              {datos.localesVisitados}/{datos.localesAsignados}
            </Text>
            <Text style={styles.kpiHomeDetalle}>locales distintos visitados</Text>
          </View>
        </View>
      ) : (
        <View style={styles.estadoInfo}>
          <Ionicons color={colores.primario} name="cloud-offline-outline" size={21} />
          <Text style={styles.estadoInfoTexto}>Conectate para actualizar tu rendimiento.</Text>
        </View>
      )}
    </View>
  );
}

export function EntradaView({
  agenda,
  procesando,
  proximidadActiva,
  alMarcar,
}: {
  agenda: VisitaHoy[];
  procesando: boolean;
  proximidadActiva: boolean;
  alMarcar: (local: VisitaHoy["local"]) => Promise<void>;
}) {
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo="Tu jornada de hoy"
        detalle="Elegí el local al llegar. Confirmaremos la distancia antes de guardar la entrada."
      />
      <View style={proximidadActiva ? styles.proximidadActiva : styles.proximidadPendiente}>
        <Ionicons
          color={proximidadActiva ? colores.exito : colores.advertencia}
          name={proximidadActiva ? "location" : "location-outline"}
          size={18}
        />
        <Text style={proximidadActiva ? styles.proximidadActivaTexto : styles.proximidadPendienteTexto}>
          {proximidadActiva
            ? "Cercanía automática activa · te avisaremos al llegar"
            : "Permití ubicación y notificaciones para recibir avisos al llegar"}
        </Text>
      </View>
      {agenda.length === 0 ? (
        <EstadoVacio
          titulo="No tenés locales programados hoy"
          detalle="Cuando tu Team Leader asigne una visita, aparecerá en esta pantalla."
        />
      ) : (
        agenda.map((visita) => (
          <View key={visita.clave} style={styles.tarjetaLocal}>
            <View style={styles.filaEntre}>
              <View style={styles.flexible}>
                <Text style={styles.localNombre}>{visita.local.nombre}</Text>
                <Text style={styles.clienteNombre}>{visita.local.cliente.nombre}</Text>
              </View>
              <View style={styles.horaChip}>
                <Text style={styles.horaChipTexto}>
                  {new Intl.DateTimeFormat("es-PY", { hour: "2-digit", minute: "2-digit" }).format(
                    new Date(visita.programadaEn),
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.detallesLocal}>
              <Text style={styles.textoSecundario}>Radio permitido: {visita.local.radioMetros} m</Text>
              <Text style={styles.textoSecundario}>
                {visita.tareasActivas} tarea{visita.tareasActivas === 1 ? "" : "s"}
              </Text>
            </View>
            <Pressable
              onPress={() => void alMarcar(visita.local)}
              disabled={procesando}
              style={({ pressed }) => [styles.botonPrimario, pressed && styles.presionado]}
            >
              <Ionicons color={colores.textoSobreOscuro} name="log-in-outline" size={19} />
              <Text style={styles.botonPrimarioTexto}>
                {procesando ? "Confirmando ubicación…" : "Marcar entrada"}
              </Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

export function VisitaActiva({
  visita,
  procesando,
  alCambiarTarea,
  alTomarFoto,
  alSalir,
}: {
  visita: Visita;
  procesando: boolean;
  alCambiarTarea: (tarea: TareaVisita) => Promise<void>;
  alTomarFoto: (tarea?: TareaVisita) => Promise<void>;
  alSalir: () => Promise<void>;
}) {
  const tareas = visita.tareas ?? [];
  const completadas = tareas.filter(({ completada }) => completada).length;
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo={`Estás en ${visita.localNombre}`}
        detalle={`Entrada ${fechaHora(visita.iniciadaEn)} · ${Math.round(visita.distanciaMetros)} m del local`}
      />
      <View style={styles.progresoTarjeta}>
        <Text style={styles.progresoNumero}>{completadas}/{tareas.length}</Text>
        <Text style={styles.textoSecundario}>tareas completadas</Text>
      </View>
      {tareas.map((tarea) => (
        <View key={tarea.id} style={styles.tarea}>
          <Pressable
            onPress={() => void alCambiarTarea(tarea)}
            disabled={procesando || !tarea.activa}
            style={styles.tareaPrincipal}
          >
            <View style={[styles.check, tarea.completada && styles.checkActivo]}>
              {tarea.completada ? (
                <Ionicons color={colores.textoSobreOscuro} name="checkmark" size={18} />
              ) : null}
            </View>
            <View style={styles.flexible}>
              <Text style={[styles.tareaTitulo, !tarea.activa && styles.textoInactivo]}>{tarea.titulo}</Text>
              <Text style={styles.textoSecundario}>{tarea.descripcion}</Text>
            </View>
          </Pressable>
          {tarea.requiereFoto ? (
            <Pressable
              onPress={() => void alTomarFoto(tarea)}
              disabled={procesando}
              style={({ pressed }) => [styles.botonFoto, pressed && styles.presionado]}
            >
              <Ionicons color={colores.primario} name="camera-outline" size={17} />
              <Text style={styles.botonFotoTexto}>{tarea.foto ? "Foto lista" : "Tomar foto"}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {visita.requiereFotoPresencia ? (
        <Pressable
          onPress={() => void alTomarFoto()}
          disabled={procesando}
          style={({ pressed }) => [styles.botonSecundario, pressed && styles.presionado]}
        >
          <Ionicons color={colores.primario} name="camera-outline" size={18} />
          <Text style={styles.botonSecundarioTexto}>
            {visita.fotoPresencia ? "Foto de presencia lista" : "Tomar foto de presencia"}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => void alSalir()}
        disabled={procesando}
        style={({ pressed }) => [styles.botonSalida, pressed && styles.presionado]}
      >
        <Ionicons color={colores.textoSobreOscuro} name="log-out-outline" size={19} />
        <Text style={styles.botonPrimarioTexto}>Marcar salida</Text>
      </Pressable>
    </View>
  );
}

export function MarcacionesView({
  items,
  pagina,
  fecha,
  pendientes,
  cargando,
  alCambiarFecha,
  alCambiarPagina,
}: {
  items: MarcacionResumen[];
  pagina: RespuestaPaginada<MarcacionResumen>;
  fecha: string | null;
  pendientes: number;
  cargando: boolean;
  alCambiarFecha: (fecha: string | null) => void;
  alCambiarPagina: (pagina: number) => void;
}) {
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const fechaSeleccionada = fecha ? new Date(`${fecha}T12:00:00`) : new Date();
  return (
    <View style={styles.seccion}>
      <TituloPantalla titulo="Mis marcaciones" detalle="Historial de entradas y salidas por local." />
      <View style={styles.filtroFecha}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filtrar marcaciones por fecha"
          onPress={() => setMostrarCalendario(true)}
          style={({ pressed }) => [styles.selectorFecha, pressed && styles.presionado]}
        >
          <Ionicons color={colores.primario} name="calendar-outline" size={19} />
          <Text style={styles.selectorFechaTexto}>{fecha ?? "Todas las fechas"}</Text>
        </Pressable>
        {fecha ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar filtro de fecha"
            onPress={() => alCambiarFecha(null)}
            style={({ pressed }) => [styles.limpiarFecha, pressed && styles.presionado]}
          >
            <Ionicons color={colores.textoSecundario} name="close" size={19} />
          </Pressable>
        ) : null}
      </View>
      {mostrarCalendario ? (
        <DateTimePicker
          display="default"
          mode="date"
          onChange={(_, seleccionada) => {
            setMostrarCalendario(false);
            if (seleccionada) alCambiarFecha(fechaIso(seleccionada));
          }}
          value={fechaSeleccionada}
        />
      ) : null}
      {pendientes > 0 ? (
        <View style={styles.avisoPendiente}>
          <Text style={styles.avisoPendienteTexto}>
            {pendientes} marcación{pendientes === 1 ? "" : "es"} guardada{pendientes === 1 ? "" : "s"} en el teléfono.
          </Text>
        </View>
      ) : null}
      <View style={styles.tabla}>
        <View style={styles.filaEncabezadoTabla}>
          <Text style={[styles.encabezadoTabla, styles.columnaLocal]}>LOCAL</Text>
          <Text style={[styles.encabezadoTabla, styles.columnaHora]}>ENTRADA</Text>
          <Text style={[styles.encabezadoTabla, styles.columnaEstado]}>ESTADO</Text>
        </View>
        {items.length === 0 ? (
          <EstadoVacio titulo="Sin marcaciones" detalle="No encontramos registros para este filtro." />
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.filaMarcacion}>
              <View style={styles.columnaLocal}>
                <Text numberOfLines={1} style={styles.localFila}>{item.localNombre}</Text>
                <Text numberOfLines={1} style={styles.clienteFila}>{item.clienteNombre}</Text>
              </View>
              <Text style={[styles.horaFila, styles.columnaHora]}>{fechaHoraCorta(item.iniciadaEn)}</Text>
              <View style={styles.columnaEstado}>
                <Text style={item.completadaEn ? styles.estadoListo : styles.estadoCurso}>
                  {item.completadaEn ? "Completa" : "En curso"}
                </Text>
                <Text style={styles.tareasFila}>{item.tareasCompletadas}/{item.tareasTotal}</Text>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={styles.paginacion}>
        <Text style={styles.paginacionTexto}>
          {pagina.total === 0 ? "0 resultados" : `Página ${pagina.page} de ${pagina.totalPages} · ${pagina.total} registros`}
        </Text>
        <View style={styles.paginacionAcciones}>
          <Pressable
            accessibilityLabel="Página anterior"
            disabled={cargando || pagina.page <= 1}
            onPress={() => alCambiarPagina(pagina.page - 1)}
            style={({ pressed }) => [styles.botonPagina, (cargando || pagina.page <= 1) && styles.botonPaginaDeshabilitado, pressed && styles.presionado]}
          >
            <Ionicons color={colores.primario} name="chevron-back" size={19} />
          </Pressable>
          <Pressable
            accessibilityLabel="Página siguiente"
            disabled={cargando || pagina.page >= pagina.totalPages}
            onPress={() => alCambiarPagina(pagina.page + 1)}
            style={({ pressed }) => [styles.botonPagina, (cargando || pagina.page >= pagina.totalPages) && styles.botonPaginaDeshabilitado, pressed && styles.presionado]}
          >
            <Ionicons color={colores.primario} name="chevron-forward" size={19} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function EstadoVacio({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <View style={styles.vacio}>
      <Text style={styles.vacioTitulo}>{titulo}</Text>
      <Text style={styles.textoSecundario}>{detalle}</Text>
    </View>
  );
}

function fechaIso(fecha: Date) {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

function fechaHoraCorta(valor: string) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

const styles = StyleSheet.create({
  seccion: { gap: espacios.md },
  tituloPantalla: { gap: espacios.xs, marginBottom: espacios.xs },
  titulo: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, lineHeight: 32 },
  descripcion: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22 },
  textoSecundario: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  heroHome: { backgroundColor: colores.fondoElevado, borderRadius: radios.grande, minHeight: 176, overflow: "hidden", padding: espacios.lg, position: "relative" },
  heroTexto: { maxWidth: "60%", zIndex: 1 },
  heroEyebrow: { color: colores.acento, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  heroTitulo: { color: colores.textoSobreOscuro, fontFamily: fuentes.titulos, fontSize: 25, fontWeight: "900", lineHeight: 31, marginTop: espacios.xs },
  heroDetalle: { color: colores.textoSobreOscuroSecundario, fontSize: 13, lineHeight: 19, marginTop: espacios.xs },
  heroImagen: { bottom: 0, height: 176, position: "absolute", right: 0, width: "44%" },
  heroImagenVelo: {
    backgroundColor: "rgba(7, 59, 76, 0.16)",
    bottom: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: "44%",
  },
  kpisHome: { flexDirection: "row", gap: espacios.sm },
  kpiHome: { borderRadius: radios.grande, flex: 1, minHeight: 184, padding: espacios.lg },
  kpiPresentaciones: { backgroundColor: colores.primario },
  kpiLocales: { backgroundColor: colores.acentoSuave },
  kpiHomeTituloClaro: { color: colores.acentoSuave, fontSize: 13, fontWeight: "800", marginTop: espacios.xs },
  kpiHomeValorClaro: { color: colores.blanco, fontFamily: fuentes.titulos, fontSize: 31, fontWeight: "900", lineHeight: 38, marginTop: espacios.xxs },
  kpiHomeDetalleClaro: { color: colores.acentoSuave, fontSize: 11, lineHeight: 16 },
  porcentajePresentaciones: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: radios.redondo, marginTop: "auto", paddingHorizontal: espacios.sm, paddingVertical: espacios.xxs },
  porcentajePresentacionesTexto: { color: colores.blanco, fontSize: 11, fontWeight: "800" },
  kpiHomeTitulo: { color: colores.textoSecundario, fontSize: 13, fontWeight: "800", marginTop: espacios.xs },
  kpiHomeValor: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 31, fontWeight: "900", lineHeight: 38, marginTop: espacios.xxs },
  kpiHomeDetalle: { color: colores.textoSecundario, fontSize: 11, lineHeight: 16 },
  estadoInfo: { alignItems: "center", backgroundColor: colores.tarjetaSuave, borderRadius: radios.medio, flexDirection: "row", gap: espacios.sm, padding: espacios.md },
  estadoInfoTexto: { color: colores.textoAviso, flex: 1, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  proximidadActiva: { alignItems: "center", backgroundColor: colores.tarjetaSuave, borderRadius: radios.medio, flexDirection: "row", gap: espacios.xs, padding: espacios.sm },
  proximidadActivaTexto: { color: colores.textoAviso, flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  proximidadPendiente: { alignItems: "center", backgroundColor: colores.advertenciaSuave, borderRadius: radios.medio, flexDirection: "row", gap: espacios.xs, padding: espacios.sm },
  proximidadPendienteTexto: { color: colores.advertencia, flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  tarjetaLocal: { backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.grande, borderWidth: 1, gap: espacios.md, padding: espacios.lg },
  filaEntre: { alignItems: "flex-start", flexDirection: "row", gap: espacios.sm, justifyContent: "space-between" },
  flexible: { flex: 1, minWidth: 0 },
  localNombre: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 17, fontWeight: "800", lineHeight: 22 },
  clienteNombre: { color: colores.textoSecundario, fontSize: 13, lineHeight: 18, marginTop: 2 },
  horaChip: { backgroundColor: colores.acentoSuave, borderRadius: radios.redondo, paddingHorizontal: espacios.sm, paddingVertical: espacios.xs },
  horaChipTexto: { color: colores.advertencia, fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  detallesLocal: { gap: espacios.xxs },
  botonPrimario: { alignItems: "center", backgroundColor: colores.primario, borderRadius: radios.medio, flexDirection: "row", gap: espacios.xs, justifyContent: "center", minHeight: 50, paddingHorizontal: espacios.lg },
  botonSalida: { alignItems: "center", backgroundColor: colores.fondoElevado, borderRadius: radios.medio, flexDirection: "row", gap: espacios.xs, justifyContent: "center", marginTop: espacios.xs, minHeight: 54, paddingHorizontal: espacios.lg },
  botonPrimarioTexto: { color: colores.textoSobreOscuro, fontSize: 15, fontWeight: "800" },
  botonSecundario: { alignItems: "center", borderColor: colores.primario, borderRadius: radios.medio, borderWidth: 1, flexDirection: "row", gap: espacios.xs, justifyContent: "center", minHeight: 46, paddingHorizontal: espacios.md },
  botonSecundarioTexto: { color: colores.primario, fontSize: 14, fontWeight: "800" },
  presionado: { opacity: 0.78, transform: [{ translateY: 1 }] },
  vacio: { alignItems: "center", backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.grande, borderStyle: "dashed", borderWidth: 1, gap: espacios.xs, padding: espacios.xl },
  vacioTitulo: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 16, fontWeight: "800", textAlign: "center" },
  progresoTarjeta: { backgroundColor: colores.acentoSuave, borderRadius: radios.medio, padding: espacios.md },
  progresoNumero: { color: colores.advertencia, fontFamily: fuentes.titulos, fontSize: 28, fontWeight: "900", fontVariant: ["tabular-nums"], lineHeight: 34 },
  tarea: { backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.medio, borderWidth: 1, gap: espacios.sm, padding: espacios.md },
  tareaPrincipal: { alignItems: "center", flexDirection: "row", gap: espacios.sm, minHeight: 48 },
  check: { alignItems: "center", borderColor: colores.borde, borderRadius: 9, borderWidth: 2, height: 28, justifyContent: "center", width: 28 },
  checkActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  tareaTitulo: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 15, fontWeight: "800", lineHeight: 20 },
  textoInactivo: { color: colores.inactivo, textDecorationLine: "line-through" },
  botonFoto: { alignItems: "center", backgroundColor: colores.tarjetaSuave, borderRadius: radios.pequeno, flexDirection: "row", gap: espacios.xs, justifyContent: "center", minHeight: 44, paddingHorizontal: espacios.md },
  botonFotoTexto: { color: colores.primario, fontSize: 13, fontWeight: "800" },
  filtroFecha: { flexDirection: "row", gap: espacios.xs },
  selectorFecha: { alignItems: "center", backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.medio, borderWidth: 1, flex: 1, flexDirection: "row", gap: espacios.xs, minHeight: 46, paddingHorizontal: espacios.md },
  selectorFechaTexto: { color: colores.texto, fontSize: 14, fontWeight: "800" },
  limpiarFecha: { alignItems: "center", backgroundColor: colores.tarjetaSuave, borderRadius: radios.medio, justifyContent: "center", minHeight: 46, width: 46 },
  avisoPendiente: { backgroundColor: colores.advertenciaSuave, borderRadius: radios.medio, padding: espacios.md },
  avisoPendienteTexto: { color: colores.advertencia, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  tabla: { backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.medio, borderWidth: 1, overflow: "hidden" },
  filaEncabezadoTabla: { backgroundColor: colores.tarjetaSuave, flexDirection: "row", gap: espacios.xs, paddingHorizontal: espacios.sm, paddingVertical: espacios.xs },
  encabezadoTabla: { color: colores.textoSecundario, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  filaMarcacion: { alignItems: "center", borderTopColor: colores.borde, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: espacios.xs, minHeight: 62, paddingHorizontal: espacios.sm, paddingVertical: espacios.xs },
  columnaLocal: { flex: 1.55, minWidth: 0 },
  columnaHora: { flex: 1.05, textAlign: "center" },
  columnaEstado: { alignItems: "flex-end", flex: 0.9 },
  localFila: { color: colores.texto, fontSize: 13, fontWeight: "800" },
  clienteFila: { color: colores.textoSecundario, fontSize: 11, marginTop: 2 },
  horaFila: { color: colores.textoSecundario, fontSize: 11, fontVariant: ["tabular-nums"], lineHeight: 15 },
  estadoListo: { color: colores.exito, fontSize: 11, fontWeight: "900" },
  estadoCurso: { color: colores.advertencia, fontSize: 11, fontWeight: "900" },
  tareasFila: { color: colores.textoSecundario, fontSize: 10, marginTop: 2 },
  paginacion: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  paginacionTexto: { color: colores.textoSecundario, flex: 1, fontSize: 12, lineHeight: 17 },
  paginacionAcciones: { flexDirection: "row", gap: espacios.xs },
  botonPagina: { alignItems: "center", backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.pequeno, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  botonPaginaDeshabilitado: { opacity: 0.42 },
});
