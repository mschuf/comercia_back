import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { NotificacionProximidad } from "../../lib/proximidad";
import type {
  MarcacionResumen,
  RendimientoImpulsador,
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

export function EntradaView({
  agenda,
  distancias,
  procesando,
  avisosActivos,
  alActualizarCercania,
  alMarcar,
  alActivarAvisos,
}: {
  agenda: VisitaHoy[];
  distancias: Record<number, number>;
  procesando: boolean;
  avisosActivos: boolean;
  alActualizarCercania: () => Promise<void>;
  alMarcar: (local: VisitaHoy["local"]) => Promise<void>;
  alActivarAvisos: () => void;
}) {
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo="Tu jornada de hoy"
        detalle="Elegí el local al llegar. Confirmaremos la distancia antes de guardar la entrada."
      />
      <View style={styles.filaAcciones}>
        <Pressable
          onPress={() => void alActualizarCercania()}
          disabled={procesando}
          style={({ pressed }) => [styles.botonSecundario, pressed && styles.presionado]}
        >
          <Text style={styles.botonSecundarioTexto}>Actualizar cercanía</Text>
        </Pressable>
        {!avisosActivos ? (
          <Pressable
            onPress={alActivarAvisos}
            style={({ pressed }) => [styles.botonSuave, pressed && styles.presionado]}
          >
            <Text style={styles.botonSuaveTexto}>Activar avisos</Text>
          </Pressable>
        ) : null}
      </View>
      {agenda.length === 0 ? (
        <EstadoVacio
          titulo="No tenés locales programados hoy"
          detalle="Cuando tu Team Leader asigne una visita, aparecerá en esta pantalla."
        />
      ) : (
        agenda.map((visita) => {
          const distancia = distancias[visita.local.id];
          const dentro = distancia !== undefined && distancia <= visita.local.radioMetros;
          return (
            <View key={visita.clave} style={styles.tarjetaLocal}>
              <View style={styles.filaEntre}>
                <View style={styles.flexible}>
                  <Text style={styles.localNombre}>{visita.local.nombre}</Text>
                  <Text style={styles.clienteNombre}>{visita.local.cliente.nombre}</Text>
                </View>
                <View style={styles.horaChip}>
                  <Text style={styles.horaChipTexto}>
                    {new Intl.DateTimeFormat("es-PY", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(visita.programadaEn))}
                  </Text>
                </View>
              </View>
              <View style={styles.detallesLocal}>
                <Text style={styles.textoSecundario}>
                  Radio permitido: {visita.local.radioMetros} m
                </Text>
                <Text style={styles.textoSecundario}>
                  {visita.tareasActivas} tarea{visita.tareasActivas === 1 ? "" : "s"}
                </Text>
                {distancia !== undefined ? (
                  <Text style={dentro ? styles.dentro : styles.fuera}>
                    Estás a {Math.round(distancia)} m · {dentro ? "podés marcar" : "acercate un poco más"}
                  </Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => void alMarcar(visita.local)}
                disabled={procesando}
                style={({ pressed }) => [styles.botonPrimario, pressed && styles.presionado]}
              >
                {procesando ? (
                  <ActivityIndicator color={colores.textoSobreOscuro} />
                ) : (
                  <Text style={styles.botonPrimarioTexto}>Marcar entrada</Text>
                )}
              </Pressable>
            </View>
          );
        })
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
  const completadas = visita.tareas.filter(({ completada }) => completada).length;
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo={`Estás en ${visita.localNombre}`}
        detalle={`Entrada ${fechaHora(visita.iniciadaEn)} · ${Math.round(visita.distanciaMetros)} m del local`}
      />
      <View style={styles.progresoTarjeta}>
        <Text style={styles.progresoNumero}>{completadas}/{visita.tareas.length}</Text>
        <Text style={styles.textoSecundario}>tareas completadas</Text>
      </View>
      {visita.tareas.map((tarea) => (
        <View key={tarea.id} style={styles.tarea}>
          <Pressable
            onPress={() => void alCambiarTarea(tarea)}
            disabled={procesando || !tarea.activa}
            style={styles.tareaPrincipal}
          >
            <View style={[styles.check, tarea.completada && styles.checkActivo]}>
              <Text style={styles.checkTexto}>{tarea.completada ? "✓" : ""}</Text>
            </View>
            <View style={styles.flexible}>
              <Text style={[styles.tareaTitulo, !tarea.activa && styles.textoInactivo]}>
                {tarea.titulo}
              </Text>
              <Text style={styles.textoSecundario}>{tarea.descripcion}</Text>
            </View>
          </Pressable>
          {tarea.requiereFoto ? (
            <Pressable
              onPress={() => void alTomarFoto(tarea)}
              disabled={procesando}
              style={({ pressed }) => [styles.botonFoto, pressed && styles.presionado]}
            >
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
        {procesando ? (
          <ActivityIndicator color={colores.textoSobreOscuro} />
        ) : (
          <Text style={styles.botonPrimarioTexto}>Marcar salida</Text>
        )}
      </Pressable>
    </View>
  );
}

export function MarcacionesView({ items, pendientes }: { items: MarcacionResumen[]; pendientes: number }) {
  return (
    <View style={styles.seccion}>
      <TituloPantalla titulo="Mis marcaciones" detalle="Tu historial de entradas y salidas por local." />
      {pendientes > 0 ? (
        <View style={styles.avisoPendiente}>
          <Text style={styles.avisoPendienteTexto}>
            {pendientes} marcación{pendientes === 1 ? "" : "es"} guardada{pendientes === 1 ? "" : "s"} en el teléfono.
          </Text>
        </View>
      ) : null}
      {items.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay marcaciones" detalle="Tu primera entrada aparecerá acá." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.tarjetaLista}>
            <View style={styles.filaEntre}>
              <View style={styles.flexible}>
                <Text style={styles.localNombre}>{item.localNombre}</Text>
                <Text style={styles.clienteNombre}>{item.clienteNombre}</Text>
              </View>
              <Text style={item.completadaEn ? styles.estadoListo : styles.estadoCurso}>
                {item.completadaEn ? "Completa" : "En curso"}
              </Text>
            </View>
            <Text style={styles.textoSecundario}>Entrada: {fechaHora(item.iniciadaEn)}</Text>
            <Text style={styles.textoSecundario}>Salida: {fechaHora(item.completadaEn)}</Text>
            <Text style={styles.tareaResumen}>
              {item.tareasCompletadas}/{item.tareasTotal} tareas · {Math.round(item.distanciaMetros)} m
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export function RendimientoView({ datos }: { datos: RendimientoImpulsador | null }) {
  if (!datos) {
    return <TituloPantalla titulo="Rendimiento" detalle="Conectate para actualizar tus resultados." />;
  }
  return (
    <View style={styles.seccion}>
      <TituloPantalla titulo="Tu rendimiento" detalle="Resumen de los últimos 30 días." />
      <View style={styles.metricasGrid}>
        <Metrica titulo="Presentaciones" valor={`${datos.presentacionesPorcentaje}%`} detalle={`${datos.presentacionesRealizadas} de ${datos.presentacionesProgramadas}`} />
        <Metrica titulo="Tareas" valor={`${datos.tareasPorcentaje}%`} detalle={`${datos.tareasCompletadas} de ${datos.tareasTotales}`} />
        <Metrica titulo="Locales visitados" valor={String(datos.localesVisitados)} detalle={`${datos.localesAsignados} asignados`} />
        <Metrica titulo="En curso" valor={String(datos.visitasEnCurso)} detalle="visitas abiertas" />
      </View>
    </View>
  );
}

export function NotificacionesView({
  items,
  avisosActivos,
  alActivar,
  alAbrirLocal,
}: {
  items: NotificacionProximidad[];
  avisosActivos: boolean;
  alActivar: () => void;
  alAbrirLocal: () => void;
}) {
  return (
    <View style={styles.seccion}>
      <TituloPantalla
        titulo="Avisos de llegada"
        detalle="Recordatorios creados por el teléfono cuando estás cerca de un local de hoy."
      />
      {!avisosActivos ? (
        <Pressable onPress={alActivar} style={({ pressed }) => [styles.botonPrimario, pressed && styles.presionado]}>
          <Text style={styles.botonPrimarioTexto}>Activar avisos</Text>
        </Pressable>
      ) : (
        <View style={styles.avisoActivo}>
          <Text style={styles.avisoActivoTexto}>Avisos activos · no se envía un recorrido al servidor</Text>
        </View>
      )}
      {items.length === 0 ? (
        <EstadoVacio titulo="Sin avisos por ahora" detalle="Cuando llegues cerca de un local, el aviso aparecerá acá." />
      ) : (
        items.map((item) => (
          <Pressable key={item.id} onPress={alAbrirLocal} style={({ pressed }) => [styles.tarjetaLista, pressed && styles.presionado]}>
            <View style={styles.filaEntre}>
              <View style={styles.flexible}>
                <Text style={styles.localNombre}>{item.localNombre}</Text>
                <Text style={styles.clienteNombre}>{item.clienteNombre}</Text>
              </View>
              {!item.leidaEn ? <View style={styles.puntoNuevo} /> : null}
            </View>
            <Text style={styles.textoSecundario}>{fechaHora(item.creadaEn)}</Text>
            <Text style={styles.enlaceTexto}>Abrir jornada</Text>
          </Pressable>
        ))
      )}
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

function Metrica({ titulo, valor, detalle }: { titulo: string; valor: string; detalle: string }) {
  return (
    <View style={styles.metrica}>
      <Text style={styles.metricaTitulo}>{titulo}</Text>
      <Text style={styles.metricaValor}>{valor}</Text>
      <Text style={styles.textoSecundario}>{detalle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: espacios.md },
  tituloPantalla: { gap: espacios.xs, marginBottom: espacios.xs },
  titulo: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 26, fontWeight: "800", letterSpacing: -0.5, lineHeight: 32 },
  descripcion: { color: colores.textoSecundario, fontSize: 15, lineHeight: 22 },
  textoSecundario: { color: colores.textoSecundario, fontSize: 13, lineHeight: 19 },
  filaAcciones: { flexDirection: "row", flexWrap: "wrap", gap: espacios.sm },
  filaEntre: { alignItems: "flex-start", flexDirection: "row", gap: espacios.sm, justifyContent: "space-between" },
  flexible: { flex: 1, minWidth: 0 },
  tarjetaLocal: { backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.grande, borderWidth: 1, gap: espacios.md, padding: espacios.lg },
  tarjetaLista: { backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.medio, borderWidth: 1, gap: espacios.xs, padding: espacios.md },
  localNombre: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 17, fontWeight: "800", lineHeight: 22 },
  clienteNombre: { color: colores.textoSecundario, fontSize: 13, lineHeight: 18, marginTop: 2 },
  horaChip: { backgroundColor: colores.acentoSuave, borderRadius: radios.redondo, paddingHorizontal: espacios.sm, paddingVertical: espacios.xs },
  horaChipTexto: { color: colores.advertencia, fontSize: 13, fontWeight: "800", fontVariant: ["tabular-nums"] },
  detallesLocal: { gap: espacios.xxs },
  dentro: { color: colores.exito, fontSize: 13, fontWeight: "800", lineHeight: 18, marginTop: espacios.xxs },
  fuera: { color: colores.advertencia, fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: espacios.xxs },
  botonPrimario: { alignItems: "center", backgroundColor: colores.primario, borderRadius: radios.medio, justifyContent: "center", minHeight: 50, paddingHorizontal: espacios.lg },
  botonSalida: { alignItems: "center", backgroundColor: colores.fondoElevado, borderRadius: radios.medio, justifyContent: "center", marginTop: espacios.xs, minHeight: 54, paddingHorizontal: espacios.lg },
  botonPrimarioTexto: { color: colores.textoSobreOscuro, fontSize: 15, fontWeight: "800" },
  botonSecundario: { alignItems: "center", borderColor: colores.primario, borderRadius: radios.medio, borderWidth: 1, flexGrow: 1, justifyContent: "center", minHeight: 46, paddingHorizontal: espacios.md },
  botonSecundarioTexto: { color: colores.primario, fontSize: 14, fontWeight: "800" },
  botonSuave: { alignItems: "center", backgroundColor: colores.acentoSuave, borderRadius: radios.medio, flexGrow: 1, justifyContent: "center", minHeight: 46, paddingHorizontal: espacios.md },
  botonSuaveTexto: { color: colores.advertencia, fontSize: 14, fontWeight: "800" },
  presionado: { opacity: 0.78, transform: [{ translateY: 1 }] },
  vacio: { alignItems: "center", backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.grande, borderStyle: "dashed", borderWidth: 1, gap: espacios.xs, padding: espacios.xl },
  vacioTitulo: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 16, fontWeight: "800", textAlign: "center" },
  progresoTarjeta: { backgroundColor: colores.acentoSuave, borderRadius: radios.medio, padding: espacios.md },
  progresoNumero: { color: colores.advertencia, fontFamily: fuentes.titulos, fontSize: 28, fontWeight: "900", fontVariant: ["tabular-nums"], lineHeight: 34 },
  tarea: { backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.medio, borderWidth: 1, gap: espacios.sm, padding: espacios.md },
  tareaPrincipal: { alignItems: "center", flexDirection: "row", gap: espacios.sm, minHeight: 48 },
  check: { alignItems: "center", borderColor: colores.borde, borderRadius: 9, borderWidth: 2, height: 28, justifyContent: "center", width: 28 },
  checkActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  checkTexto: { color: colores.textoSobreOscuro, fontSize: 17, fontWeight: "900" },
  tareaTitulo: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 15, fontWeight: "800", lineHeight: 20 },
  textoInactivo: { color: colores.inactivo, textDecorationLine: "line-through" },
  botonFoto: { alignItems: "center", backgroundColor: colores.tarjetaSuave, borderRadius: radios.pequeno, justifyContent: "center", minHeight: 44, paddingHorizontal: espacios.md },
  botonFotoTexto: { color: colores.primario, fontSize: 13, fontWeight: "800" },
  avisoPendiente: { backgroundColor: colores.advertenciaSuave, borderRadius: radios.medio, padding: espacios.md },
  avisoPendienteTexto: { color: colores.advertencia, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  avisoActivo: { backgroundColor: colores.tarjetaSuave, borderRadius: radios.medio, padding: espacios.md },
  avisoActivoTexto: { color: colores.textoAviso, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  estadoListo: { color: colores.exito, fontSize: 12, fontWeight: "800" },
  estadoCurso: { color: colores.advertencia, fontSize: 12, fontWeight: "800" },
  tareaResumen: { color: colores.texto, fontSize: 13, fontWeight: "700", lineHeight: 18, marginTop: espacios.xxs },
  metricasGrid: { flexDirection: "row", flexWrap: "wrap", gap: espacios.sm },
  metrica: { backgroundColor: colores.tarjeta, borderColor: colores.borde, borderRadius: radios.grande, borderWidth: 1, flexGrow: 1, minWidth: 140, padding: espacios.lg, width: "48%" },
  metricaTitulo: { color: colores.textoSecundario, fontSize: 13, fontWeight: "700" },
  metricaValor: { color: colores.texto, fontFamily: fuentes.titulos, fontSize: 30, fontWeight: "900", fontVariant: ["tabular-nums"], lineHeight: 38, marginVertical: espacios.xs },
  enlaceTexto: { color: colores.primario, fontSize: 13, fontWeight: "800", marginTop: espacios.xs },
  puntoNuevo: { backgroundColor: colores.acento, borderRadius: 5, height: 10, marginTop: espacios.xs, width: 10 },
});
