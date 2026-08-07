# Comercia Móvil

MVP de ubicación consentida para usuarios de Comercia. En Android intenta leer
los números que el sistema expone para SIM 1 y SIM 2, con permiso explícito, y
los compara con el celular E.164 de los usuarios de Comercia. Si Android no
expone un número, no hay coincidencia o el dispositivo es iOS, se usa correo o
usuario y contraseña. La sesión resultante se conserva cifrada en el equipo.

## Configuración

1. La app apunta por defecto a `https://api.comercia.pro/api/v1`; el valor está
   en `.env` y `.env.example`.
2. Aplicá la migración de la API antes de usar el rastreo:

```powershell
npm --prefix apps/api run prisma:deploy
```

3. Desplegá también los cambios de backend de este repositorio antes de probar
   login por SIM o ubicaciones contra producción. No alcanza con configurar la
   URL: esos endpoints tienen que existir en `api.comercia.pro`.

## Generar el APK de prueba

La configuración `eas.json` ya produce un APK instalable (`preview`) y fija la
URL de producción en la build. Desde esta carpeta ejecutá:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

EAS mostrará un enlace al APK terminado. Abrilo en el Android, permití instalar
desde el navegador o administrador de archivos cuando Android lo solicite y
después instalalo. El APK no funciona en Expo Go porque usa un módulo Android
propio para SIM y una tarea de ubicación en segundo plano.

Para compilar localmente necesitás JDK 17 y Android SDK configurados. Luego:

```powershell
npx expo prebuild --platform android
npx expo run:android
```

El APK debug queda en
`android/app/build/outputs/apk/debug/app-debug.apk`.

## Prueba en Android

1. Abrí la app. Si ya hubo una sesión cifrada, se restaura automáticamente.
2. En un primer uso, tocá **Continuar con número de SIM** y aceptá la lectura
   de estado y número de teléfono. Android puede devolver cero, uno o dos
   números según el equipo y la operadora.
3. Si solo una SIM coincide con `usuarios.celular`, inicia la sesión. Si no,
   ingresá correo/usuario y contraseña.
4. Activá el seguimiento y aceptá primero ubicación y luego ubicación en
   segundo plano. Android muestra la notificación persistente.

## Alcance y límites

Al activar el seguimiento, la app explica qué se envía y solicita los permisos
de ubicación de primer plano y segundo plano. Android muestra una notificación
persistente mientras el servicio está activo e iOS muestra su indicador de uso
de ubicación. La persona puede detener el seguimiento o cerrar sesión.

Se solicita una actualización cada minuto, pero iOS y Android pueden agrupar,
retrasar o detener eventos para ahorrar batería; una app eliminada por el
usuario no puede garantizar reiniciarse sola, especialmente en Android. Android
documenta que un número de SIM puede estar vacío o requerir verificación extra,
por lo que el fallback de contraseña siempre se conserva.
