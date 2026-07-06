import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // typedRoutes desactivado: las rutas de módulos/páginas se configuran en la
  // base de datos (runtime), así que no se pueden verificar en compilación.
  // Build autocontenido para Docker; la raíz de trazado es el monorepo
  // para que el standalone incluya las dependencias hoisted de la raíz.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
