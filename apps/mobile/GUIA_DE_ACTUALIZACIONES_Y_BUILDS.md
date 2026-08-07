# Guía de actualizaciones y APK local

Esta app se llama **Comercia Ubicación**. Sirve para ubicar, con consentimiento,
al equipo comercial, repositoras y repositores, impulsadoras e impulsadores y
otras personas autorizadas de la empresa.

## Dónde queda cada APK

El comando local crea automáticamente esta carpeta si no existe:

`C:\Users\<tu-usuario>\Documents\Comercia Ubicacion APK`

Dentro de esa carpeta crea una subcarpeta por cada build:

- `v<versión>-<fecha>\Comercia-Ubicacion-v<versión>.apk`

Así cada APK queda aislada con la versión que le corresponde y no se mezclan
archivos de builds anteriores.

## Preparación inicial de una PC

Esta PC ya tiene JDK 17, Android Studio, Android SDK API 36, build-tools, NDK y
CMake instalados. Para otra PC, instalar JDK 17 y Android Studio, abrir el SDK
Manager e instalar Android API 36 y Build-Tools 36.0.0. Luego configurar
`JAVA_HOME`, `ANDROID_HOME` y `ANDROID_SDK_ROOT`.

En la raíz del repositorio instalar las dependencias:

```powershell
npm.cmd install
```

## Actualizar la aplicación

1. Traer los cambios aprobados:

```powershell
git pull origin main
npm.cmd install
```

2. Revisar `apps/mobile/.env`. Debe tener una URL HTTPS válida, por ejemplo:

```dotenv
EXPO_PUBLIC_API_URL=https://api.comercia.pro/api/v1
```

3. Antes de distribuir una nueva versión, editar `apps/mobile/app.json` y subir
   ambos valores:

```json
"version": "1.0.1",
"versionCode": 2
```

`version` es lo que ve la persona que instala la app. `versionCode` debe crecer
siempre de uno en uno para que Android acepte una actualización sobre una APK
anterior.

## Crear una APK local

Desde la raíz del repositorio ejecutar:

```powershell
npm.cmd --prefix apps/mobile run build:apk
```

El comando regenera el proyecto Android desde `app.json`, compila la variante
release y copia la APK a Documentos con su versión y fecha. La primera build de
una PC es lenta porque Gradle descarga dependencias; las siguientes aprovechan
la caché local.

## Instalar y probar en Android

Copiar la APK al teléfono, abrirla desde el administrador de archivos y aceptar
la instalación desde esa fuente si Android lo pregunta. También se puede usar
un teléfono conectado por USB con depuración USB habilitada:

```powershell
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r "C:\Users\<tu-usuario>\Documents\Comercia Ubicacion APK\v<versión>-<fecha>\Comercia-Ubicacion-v<versión>.apk"
```

La APK local usa la clave de desarrollo del proyecto: es válida para pruebas
internas, no para publicar en Google Play. Para Play Store se debe crear y
resguardar una clave de firma de producción.

## Antes de probar funciones reales

Confirmar que `api.comercia.pro` ya tenga desplegados los endpoints de login
móvil, consentimiento y ubicaciones, además de su migración de base de datos.
Después iniciar sesión, aceptar los permisos solicitados y activar el
seguimiento solo con consentimiento de la persona.
