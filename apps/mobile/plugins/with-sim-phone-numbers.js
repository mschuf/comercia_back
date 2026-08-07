const fs = require("fs/promises");
const path = require("path");
const { withDangerousMod } = require("expo/config-plugins");

const NOMBRE_ARCHIVO = "SimPhoneNumbersModule.kt";
const NOMBRE_PAQUETE = "SimPhoneNumbersPackage";

async function buscarArchivo(raiz, nombre) {
  const entradas = await fs.readdir(raiz, { withFileTypes: true });
  for (const entrada of entradas) {
    const ruta = path.join(raiz, entrada.name);
    if (entrada.isFile() && entrada.name === nombre) return ruta;
    if (entrada.isDirectory()) {
      const encontrado = await buscarArchivo(ruta, nombre);
      if (encontrado) return encontrado;
    }
  }
  return null;
}

function codigoModulo(packageName) {
  return `package ${packageName}.sim

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SubscriptionManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager

class SimPhoneNumbersModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ComerciaSimPhoneNumbers"

  private fun tienePermisos(): Boolean {
    if (reactContext.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
      return false
    }
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
      reactContext.checkSelfPermission(Manifest.permission.READ_PHONE_NUMBERS) == PackageManager.PERMISSION_GRANTED
  }

  @ReactMethod
  fun getAvailablePhoneNumbers(promise: Promise) {
    if (!tienePermisos()) {
      promise.reject("PERMISSION_DENIED", "Falta permiso para leer números de SIM")
      return
    }

    try {
      val subscriptionManager = reactContext.getSystemService(SubscriptionManager::class.java)
      val numeros = Arguments.createArray()
      val vistos = mutableSetOf<String>()
      for (subscription in subscriptionManager.activeSubscriptionInfoList.orEmpty()) {
        @Suppress("DEPRECATION")
        val numero = (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          subscriptionManager.getPhoneNumber(subscription.subscriptionId)
        } else {
          subscription.number
        }) ?: ""
        if (numero.isNotBlank() && vistos.add(numero)) {
          val item = Arguments.createMap()
          item.putInt("slotIndex", subscription.simSlotIndex + 1)
          item.putString("number", numero)
          numeros.pushMap(item)
        }
      }
      promise.resolve(numeros)
    } catch (error: SecurityException) {
      promise.reject("PERMISSION_DENIED", "No se pudo leer la SIM", error)
    } catch (error: Exception) {
      promise.reject("SIM_READ_ERROR", "No se pudo leer la SIM", error)
    }
  }
}

class SimPhoneNumbersPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(SimPhoneNumbersModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
`;
}

function actualizarMainApplication(contenido, packageName) {
  const importacion = `import ${packageName}.sim.${NOMBRE_PAQUETE}`;
  let actualizado = contenido;
  if (!actualizado.includes(importacion)) {
    actualizado = actualizado.replace(
      /^(package\s+.+)$/m,
      `$1\n\n${importacion}`,
    );
  }

  const registro = `add(${NOMBRE_PAQUETE}())`;
  if (!actualizado.includes(registro)) {
    const patron = /PackageList\(this\)\.packages\.apply\s*\{\s*/;
    if (!patron.test(actualizado)) {
      throw new Error("No se encontró getPackages() en MainApplication.kt");
    }
    actualizado = actualizado.replace(
      patron,
      (coincidencia) => `${coincidencia}\n              ${registro}\n`,
    );
  }
  return actualizado;
}

module.exports = function withSimPhoneNumbers(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      if (modConfig.modRequest.introspect) return modConfig;

      const packageName = config.android?.package;
      if (!packageName) {
        throw new Error("android.package es obligatorio para el módulo de SIM");
      }
      const androidRoot = modConfig.modRequest.platformProjectRoot;
      const javaRoot = path.join(androidRoot, "app", "src", "main", "java");
      const mainApplication = await buscarArchivo(
        javaRoot,
        "MainApplication.kt",
      );
      if (!mainApplication) {
        throw new Error(
          "No se encontró MainApplication.kt para registrar el módulo de SIM",
        );
      }

      const directorioModulo = path.join(
        javaRoot,
        ...packageName.split("."),
        "sim",
      );
      await fs.mkdir(directorioModulo, { recursive: true });
      await fs.writeFile(
        path.join(directorioModulo, NOMBRE_ARCHIVO),
        codigoModulo(packageName),
        "utf8",
      );

      const main = await fs.readFile(mainApplication, "utf8");
      await fs.writeFile(
        mainApplication,
        actualizarMainApplication(main, packageName),
        "utf8",
      );
      return modConfig;
    },
  ]);
};
