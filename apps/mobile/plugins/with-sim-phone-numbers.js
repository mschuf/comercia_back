const fs = require("fs/promises");
const path = require("path");
const { withAppBuildGradle, withDangerousMod } = require("expo/config-plugins");

const NOMBRE_ARCHIVO = "SimPhoneNumbersModule.kt";
const NOMBRE_PAQUETE = "SimPhoneNumbersPackage";
const DEPENDENCIA_PHONE_HINT =
  'implementation("com.google.android.gms:play-services-auth:21.6.0")';

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
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.PhoneNumberUtils
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager
import com.google.android.gms.auth.api.identity.GetPhoneNumberHintIntentRequest
import com.google.android.gms.auth.api.identity.Identity
import java.util.Locale

class SimPhoneNumbersModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ComerciaSimPhoneNumbers"

  private var promesaSugerencia: Promise? = null

  private val listenerActividad = object : BaseActivityEventListener() {
    override fun onActivityResult(
      activity: Activity,
      requestCode: Int,
      resultCode: Int,
      data: Intent?,
    ) {
      if (requestCode != SOLICITUD_NUMERO_TELEFONO) return
      val promise = promesaSugerencia ?: return
      promesaSugerencia = null

      if (resultCode != Activity.RESULT_OK || data == null) {
        promise.resolve(null)
        return
      }

      try {
        val numero = Identity.getSignInClient(activity)
          .getPhoneNumberFromIntent(data)
          .trim()
        promise.resolve(numero.takeIf { it.isNotBlank() })
      } catch (error: Exception) {
        promise.reject(
          "PHONE_HINT_ERROR",
          "No se pudo obtener el número seleccionado",
          error,
        )
      }
    }
  }

  init {
    reactContext.addActivityEventListener(listenerActividad)
  }

  override fun invalidate() {
    promesaSugerencia?.reject(
      "PHONE_HINT_CANCELLED",
      "La aplicación se cerró antes de seleccionar un número",
    )
    promesaSugerencia = null
    reactContext.removeActivityEventListener(listenerActividad)
    super.invalidate()
  }

  private fun tienePermisos(): Boolean {
    if (reactContext.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
      return false
    }
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.O ||
      reactContext.checkSelfPermission(Manifest.permission.READ_PHONE_NUMBERS) == PackageManager.PERMISSION_GRANTED
  }

  private fun normalizarNumero(numero: String?, paisIso: String?): String? {
    val limpio = numero?.trim().orEmpty()
    if (limpio.isBlank()) return null
    val iso = paisIso?.trim()?.uppercase(Locale.ROOT).orEmpty()
    if (iso.isNotBlank()) {
      PhoneNumberUtils.formatNumberToE164(limpio, iso)?.let { return it }
    }
    return limpio
  }

  @ReactMethod
  fun getAvailablePhoneNumbers(promise: Promise) {
    if (!tienePermisos()) {
      promise.reject("PERMISSION_DENIED", "Falta permiso para leer números de SIM")
      return
    }

    try {
      val subscriptionManager = reactContext.getSystemService(SubscriptionManager::class.java)
      val telephonyManager = reactContext.getSystemService(TelephonyManager::class.java)
      val numeros = Arguments.createArray()
      for (subscription in subscriptionManager.activeSubscriptionInfoList.orEmpty()) {
        @Suppress("DEPRECATION")
        val principal = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          subscriptionManager.getPhoneNumber(subscription.subscriptionId)
        } else {
          subscription.number
        }
        val telefonoDeSim = telephonyManager.createForSubscriptionId(subscription.subscriptionId)
        @Suppress("DEPRECATION")
        val respaldo = try {
          telefonoDeSim.line1Number
        } catch (_: SecurityException) {
          null
        }
        val paisIso = subscription.countryIso ?: telefonoDeSim.networkCountryIso
        val numero = normalizarNumero(principal, paisIso)
          ?: normalizarNumero(respaldo, paisIso)
        val item = Arguments.createMap()
        item.putInt("slotIndex", subscription.simSlotIndex + 1)
        if (!numero.isNullOrBlank()) {
          item.putString("number", numero)
        } else {
          item.putNull("number")
        }
        numeros.pushMap(item)
      }
      promise.resolve(numeros)
    } catch (error: SecurityException) {
      promise.reject("PERMISSION_DENIED", "No se pudo leer la SIM", error)
    } catch (error: Exception) {
      promise.reject("SIM_READ_ERROR", "No se pudo leer la SIM", error)
    }
  }

  @ReactMethod
  fun requestPhoneNumberHint(promise: Promise) {
    if (promesaSugerencia != null) {
      promise.reject(
        "PHONE_HINT_IN_PROGRESS",
        "Ya hay una selección de número en curso",
      )
      return
    }

    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject(
        "ACTIVITY_UNAVAILABLE",
        "La pantalla de la aplicación todavía no está disponible",
      )
      return
    }

    val solicitud = GetPhoneNumberHintIntentRequest.builder().build()
    Identity.getSignInClient(activity)
      .getPhoneNumberHintIntent(solicitud)
      .addOnSuccessListener { resultado ->
        promesaSugerencia = promise
        try {
          activity.startIntentSenderForResult(
            resultado.intentSender,
            SOLICITUD_NUMERO_TELEFONO,
            null,
            0,
            0,
            0,
          )
        } catch (error: Exception) {
          promesaSugerencia = null
          promise.reject(
            "PHONE_HINT_LAUNCH_ERROR",
            "No se pudo abrir el selector de números SIM",
            error,
          )
        }
      }
      .addOnFailureListener { error ->
        promise.reject(
          "PHONE_HINT_UNAVAILABLE",
          "Android no ofreció números SIM para seleccionar",
          error,
        )
      }
  }

  companion object {
    private const val SOLICITUD_NUMERO_TELEFONO = 7216
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

function agregarDependenciaPhoneHint(contenido) {
  if (contenido.includes("com.google.android.gms:play-services-auth")) {
    return contenido;
  }

  const patron = /dependencies\s*\{\s*/;
  if (!patron.test(contenido)) {
    throw new Error("No se encontró dependencies en app/build.gradle");
  }
  return contenido.replace(
    patron,
    (coincidencia) => `${coincidencia}\n    ${DEPENDENCIA_PHONE_HINT}\n`,
  );
}

module.exports = function withSimPhoneNumbers(config) {
  const configConDependencia = withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = agregarDependenciaPhoneHint(
      modConfig.modResults.contents,
    );
    return modConfig;
  });

  return withDangerousMod(configConDependencia, [
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
