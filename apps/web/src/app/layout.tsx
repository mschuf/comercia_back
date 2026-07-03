import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "comercIA",
  description:
    "comercIA — la herramienta del equipo comercial de Frigorífico Guaraní",
};

// Aplica el tema ANTES del primer pintado (sin destello): usa la elección
// guardada del usuario o, si no eligió, la preferencia del dispositivo.
const scriptTema = `(function(){try{var t=localStorage.getItem("tema");var oscuro=t?t==="oscuro":matchMedia("(prefers-color-scheme: dark)").matches;if(oscuro)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      {/* suppressHydrationWarning: las extensiones del navegador (ColorZilla,
          Grammarly, etc.) inyectan atributos en el body antes de que React
          hidrate; eso no es un error nuestro y no debe ensuciar la consola */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
        {children}
      </body>
    </html>
  );
}
