"use client";

import { createContext, useContext } from "react";
import type { UsuarioSesion } from "@/types/usuario";
import type { ModuloMenu } from "@/types/plataforma";

export interface PanelData {
  usuario: UsuarioSesion;
  modulos: ModuloMenu[];
}

const PanelContext = createContext<PanelData | null>(null);

export function PanelProvider({
  value,
  children,
}: {
  value: PanelData;
  children: React.ReactNode;
}) {
  return <PanelContext value={value}>{children}</PanelContext>;
}

export function usePanel(): PanelData {
  const ctx = useContext(PanelContext);
  if (!ctx) {
    throw new Error("usePanel debe usarse dentro de PanelProvider");
  }
  return ctx;
}
