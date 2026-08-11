# Comercia Móvil

La guía operativa para actualizar la app y generar APKs locales está en
[GUIA_DE_ACTUALIZACIONES_Y_BUILDS.md](./GUIA_DE_ACTUALIZACIONES_Y_BUILDS.md).

Aplicación de ubicación consentida para usuarios de Comercia. En Android
intenta leer automáticamente los números que el sistema expone para SIM 1 y
SIM 2 y los compara con el celular E.164 de los usuarios. Si Android no expone
un número o no hay coincidencia, se usa correo/usuario y contraseña.

## Ubicación sin conexión

Con el seguimiento activo, cada lectura se guarda primero en una base SQLite
privada de la aplicación. Luego se intenta enviar al servidor y solo se elimina
del teléfono cuando la API confirma la recepción. La cola se vuelve a procesar:

- en cada ciclo de ubicación (aproximadamente cada 3 minutos);
- cuando Android detecta nuevamente una conexión a internet;
- al abrir o regresar a la aplicación.

La primera activación necesita internet para registrar el consentimiento. Una
vez activa, la captura puede continuar sin Wi-Fi ni datos móviles. La pantalla
muestra cuántas ubicaciones siguen pendientes.

## Configuración

1. La app apunta por defecto a `https://api.comercia.pro/api/v1`; el valor está
   en `.env` y `.env.example`.
2. Aplicá las migraciones de la API antes de usar cambios nuevos del backend:

```powershell
npm --prefix apps/api run prisma:deploy
```

3. Desplegá los cambios del backend antes de probar rutas nuevas contra
   producción.

## Generar el APK

La configuración `eas.json` produce un APK instalable con el perfil `preview`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

Para compilar localmente necesitás JDK 17 y Android SDK configurados:

```powershell
npx expo prebuild --platform android
npx expo run:android
```

El APK de depuración queda en
`android/app/build/outputs/apk/debug/app-debug.apk`.

## Prueba en Android

1. Abrí la app. Si existe una sesión segura, se restaura automáticamente.
2. En el primer uso, aceptá los permisos de teléfono. La app intenta el inicio
   por SIM sin mostrar un botón adicional.
3. Si Android no entrega un número o no coincide con una cuenta, ingresá las
   credenciales.
4. Activá el seguimiento y aceptá ubicación precisa y en segundo plano.
5. Desactivá Wi-Fi y datos para comprobar que aumenta el contador pendiente;
   al recuperar internet debe volver a cero.

## Límites reales del sistema

Android puede devolver el número de SIM vacío aunque los permisos estén
concedidos. El número tampoco prueba por sí solo quién posee el teléfono; para
una autenticación fuerte se necesita una verificación adicional, por ejemplo
SMS OTP y vinculación del dispositivo.

Android e iOS también pueden retrasar eventos para ahorrar batería. Ninguna app
puede seguir ejecutándose si el usuario la fuerza a detener, revoca permisos o
el sistema restringe totalmente su actividad. Por eso se conserva el ingreso
por contraseña y la pantalla informa el estado real de captura y sincronización.
