const { withAppBuildGradle } = require("expo/config-plugins");

const MARCADOR =
  '        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL",';
const AJUSTE = `        // Windows: fuerza a CMake a hashear rutas nativas antes del limite de Ninja.
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=180"
            }
        }

`;

module.exports = function withShortCmakeObjectPaths(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== "groovy") {
      throw new Error("El ajuste de rutas CMake requiere build.gradle Groovy");
    }
    const contenido = modConfig.modResults.contents;
    if (contenido.includes("CMAKE_OBJECT_PATH_MAX")) return modConfig;
    if (!contenido.includes(MARCADOR)) {
      throw new Error("No se encontro defaultConfig en app/build.gradle");
    }
    modConfig.modResults.contents = contenido.replace(
      MARCADOR,
      `${AJUSTE}${MARCADOR}`,
    );
    return modConfig;
  });
};
