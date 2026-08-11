const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const mobileRoot = path.resolve(__dirname, "..");
const androidRoot = path.join(mobileRoot, "android");
const config = JSON.parse(
  fs.readFileSync(path.join(mobileRoot, "app.json"), "utf8"),
).expo;

function existeDirectorio(ruta) {
  return (
    Boolean(ruta) && fs.existsSync(ruta) && fs.statSync(ruta).isDirectory()
  );
}

function primerDirectorioExistente(candidatos) {
  return candidatos.find(existeDirectorio);
}

function buscarJavaHome() {
  const candidatos = [process.env.JAVA_HOME];
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const microsoft = path.join(localAppData, "Programs", "Microsoft");
    if (existeDirectorio(microsoft)) {
      const jdks = fs
        .readdirSync(microsoft)
        .filter((nombre) => nombre.startsWith("jdk-17"))
        .sort()
        .reverse()
        .map((nombre) => path.join(microsoft, nombre));
      candidatos.push(...jdks);
    }
  }
  candidatos.push("C:\\Program Files\\Android\\Android Studio\\jbr");
  return primerDirectorioExistente(candidatos);
}

function ejecutar(comando, argumentos, directorio, entorno) {
  const resultado = spawnSync(comando, argumentos, {
    cwd: directorio,
    env: entorno,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (resultado.error) throw resultado.error;
  if (resultado.status !== 0) {
    throw new Error(`${comando} finalizó con código ${resultado.status}.`);
  }
}

function marcaDeTiempo(fecha) {
  const dosDigitos = (valor) => String(valor).padStart(2, "0");
  return (
    [
      fecha.getFullYear(),
      dosDigitos(fecha.getMonth() + 1),
      dosDigitos(fecha.getDate()),
    ].join("") +
    `-${dosDigitos(fecha.getHours())}${dosDigitos(fecha.getMinutes())}`
  );
}

function nombreSeguro(valor) {
  return valor.replace(/[^a-zA-Z0-9.-]/g, "-");
}

const localAppData = process.env.LOCALAPPDATA;
const androidHome = primerDirectorioExistente([
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  localAppData && path.join(localAppData, "Android", "Sdk"),
]);
const javaHome = buscarJavaHome();

if (!androidHome || !javaHome) {
  throw new Error(
    "No se encontró JDK 17 o Android SDK. Consultá GUIA_DE_ACTUALIZACIONES_Y_BUILDS.md.",
  );
}

const entorno = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  NODE_ENV: "production",
};
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const gradle = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

console.log("Regenerando Android desde app.json...");
ejecutar(
  npx,
  ["expo", "prebuild", "--platform", "android", "--no-install"],
  mobileRoot,
  entorno,
);

console.log("Compilando APK release...");
ejecutar(gradle, ["assembleRelease", "--no-daemon"], androidRoot, entorno);

const apkOrigen = path.join(
  androidRoot,
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);
if (!fs.existsSync(apkOrigen)) {
  throw new Error("La build terminó, pero no se encontró app-release.apk.");
}

const carpetaDestino = path.join(
  os.homedir(),
  "Documents",
  "Comercia Ubicacion APK",
);
fs.mkdirSync(carpetaDestino, { recursive: true });

const version = nombreSeguro(config.version);
const fecha = marcaDeTiempo(new Date());
const carpetaBuild = path.join(carpetaDestino, `v${version}-${fecha}`);
const nombre = `Comercia-Ubicacion-v${version}.apk`;
const apkDestino = path.join(carpetaBuild, nombre);

fs.mkdirSync(carpetaBuild, { recursive: true });
fs.copyFileSync(apkOrigen, apkDestino);

console.log(`\nAPK creado: ${apkDestino}`);
