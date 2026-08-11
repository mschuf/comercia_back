const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
const buildRoot = process.env.COMERCIA_BUILD_ROOT;

if (buildRoot) {
  config.watchFolders = [path.resolve(buildRoot)];
  config.resolver.nodeModulesPaths = [
    path.join(__dirname, "node_modules"),
    path.join(path.resolve(buildRoot), "node_modules"),
  ];
}

// El monorepo usa React 19.2.4 en Next.js y 19.2.3 en React Native. Algunos
// módulos hoisted resolvían la copia web y generaban dos React dentro del APK,
// lo que rompe los hooks en producción. Todos los imports react/* del bundle
// móvil deben salir de la dependencia declarada por esta aplicación.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react" || moduleName.startsWith("react/")) {
    const reactMovil = require.resolve(moduleName, { paths: [__dirname] });
    return context.resolveRequest(context, reactMovil, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
