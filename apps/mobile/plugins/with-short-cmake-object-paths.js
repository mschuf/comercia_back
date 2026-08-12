const { withAppBuildGradle } = require("expo/config-plugins");

const MARCADOR =
  '        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL",';
const MARCADOR_STAGING = "    signingConfigs {";
const AJUSTE = `        // Windows: fuerza a CMake a hashear rutas nativas antes del limite de Ninja.
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=250"
            }
        }

`;
const AJUSTE_STAGING = `    // Evita que las rutas C++ de React Native excedan el limite de Windows.
    externalNativeBuild {
        cmake {
            buildStagingDirectory new File(System.getProperty("java.io.tmpdir"), "comercia-cmake")
        }
    }

`;

module.exports = function withShortCmakeObjectPaths(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== "groovy") {
      throw new Error("El ajuste de rutas CMake requiere build.gradle Groovy");
    }
    const contenido = modConfig.modResults.contents;
    if (
      !contenido.includes("CMAKE_OBJECT_PATH_MAX") &&
      !contenido.includes(MARCADOR)
    ) {
      throw new Error("No se encontro defaultConfig en app/build.gradle");
    }
    let actualizado = contenido;
    if (!actualizado.includes("CMAKE_OBJECT_PATH_MAX")) {
      actualizado = actualizado.replace(MARCADOR, `${AJUSTE}${MARCADOR}`);
    }
    if (!actualizado.includes("comercia-cmake")) {
      actualizado = actualizado.replace(
        MARCADOR_STAGING,
        `${AJUSTE_STAGING}${MARCADOR_STAGING}`,
      );
    }
    modConfig.modResults.contents = actualizado;
    return modConfig;
  });
};
