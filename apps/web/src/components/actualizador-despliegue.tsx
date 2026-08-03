"use client";

import { useEffect } from "react";

const INTERVALO_COMPROBACION_MS = 60_000;
const PARAMETRO_VERSION = "_comercia_dpl";
const REGEX_DEPLOYMENT_ID = /\bdata-dpl-id=(?:"([^"]+)"|'([^']+)')/;

function deploymentIdDelHtml(html: string): string | null {
  const coincidencia = REGEX_DEPLOYMENT_ID.exec(html);
  return coincidencia?.[1] ?? coincidencia?.[2] ?? null;
}

async function obtenerDeploymentId(signal: AbortSignal): Promise<string | null> {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAMETRO_VERSION, Date.now().toString());

  const respuesta = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });

  if (!respuesta.ok) return null;

  return deploymentIdDelHtml(await respuesta.text());
}

export function ActualizadorDespliegue() {
  useEffect(() => {
    const urlActual = new URL(window.location.href);
    if (urlActual.searchParams.has(PARAMETRO_VERSION)) {
      urlActual.searchParams.delete(PARAMETRO_VERSION);
      window.history.replaceState(window.history.state, "", urlActual);
    }

    const controller = new AbortController();
    let comprobando = false;

    const comprobarVersion = async () => {
      const versionCargada = document.documentElement.dataset.dplId;
      if (
        !versionCargada ||
        document.visibilityState === "hidden" ||
        comprobando
      ) {
        return;
      }

      comprobando = true;
      try {
        const versionServidor = await obtenerDeploymentId(controller.signal);
        if (versionServidor && versionServidor !== versionCargada) {
          const destino = new URL(window.location.href);
          destino.searchParams.set(PARAMETRO_VERSION, versionServidor);
          window.location.replace(destino);
        }
      } catch {
        // Un fallo transitorio de red se vuelve a intentar en el próximo ciclo.
      } finally {
        comprobando = false;
      }
    };

    void comprobarVersion();
    const intervalo = window.setInterval(
      comprobarVersion,
      INTERVALO_COMPROBACION_MS,
    );
    window.addEventListener("focus", comprobarVersion);
    document.addEventListener("visibilitychange", comprobarVersion);

    return () => {
      controller.abort();
      window.clearInterval(intervalo);
      window.removeEventListener("focus", comprobarVersion);
      document.removeEventListener("visibilitychange", comprobarVersion);
    };
  }, []);

  return null;
}
