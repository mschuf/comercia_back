# Backdrop de procesos

Usa `BackdropProceso` cuando una accion iniciada por la persona usuaria debe
esperar GPS, red, almacenamiento o permisos. La capa bloquea los toques y
comunica que la operacion sigue en curso, evitando dobles marcaciones.

El componente esta en `src/components/backdrop-proceso.tsx`. El contenedor de
la pantalla debe tener `position: "relative"` para que la capa cubra toda la
vista.

```tsx
const [procesando, setProcesando] = useState(false);
const [mensajeProceso, setMensajeProceso] = useState<string | null>(null);

async function guardar() {
  setProcesando(true);
  setMensajeProceso("Guardando los cambios...");
  try {
    await guardarCambios();
  } finally {
    setProcesando(false);
    setMensajeProceso(null);
  }
}

return (
  <View style={styles.pantalla}>
    <Contenido />
    <BackdropProceso
      detalle="No cierres la aplicacion mientras terminamos."
      titulo={mensajeProceso ?? "Procesando..."}
      visible={procesando}
    />
  </View>
);
```

Reglas de uso:

- Activar el estado antes del primer `await` y liberarlo siempre en `finally`.
- Usar un titulo concreto que nombre la accion, por ejemplo, `Marcando salida...`.
- Mantener el boton que inicia la accion deshabilitado mientras `procesando` es
  verdadero; el backdrop protege tambien el resto de la pantalla.
- No usarlo para refrescos silenciosos, calculos locales inmediatos ni tareas
  en segundo plano que no bloquean a la persona usuaria.
