"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";
import { useListaCampo, useOperacionCampo } from "@/hooks/use-lista-campo";
import { Modal } from "@/components/modal";
import { PantallaCarga } from "@/components/pantalla-carga";
import { SelectorPaginado } from "@/components/selector-paginado";
import { btnGhost, errorBox } from "@/components/ui";
import { TablaCampo } from "./tabla-campo";
import {
  BotonesFormulario,
  CabeceraCampo,
  CampoActivo,
  CampoTexto,
} from "./form-campo";
import { MapaLocal } from "./mapa-local";
import { PlanLocal } from "./plan-local";
import type { ClienteCampo, LocalCampo } from "@/types/campo";

const SelectorUbicacion = dynamic(() => import("./selector-ubicacion"), {
  ssr: false,
  loading: () => <p role="status">Cargando mapa…</p>,
});

export function ClientesPanel() {
  const lista = useListaCampo<ClienteCampo>("/campo/clientes");
  const op = useOperacionCampo();
  const [form, setForm] = useState<ClienteCampo | null>(null);
  return (
    <>
      <CabeceraCampo
        titulo="Clientes"
        detalle="Clientes de tu empresa y sus datos de contacto."
        crear={() =>
          setForm({
            id: 0,
            nombre: "",
            ruc: "",
            contacto: "",
            telefono: "",
            activo: true,
          })
        }
      />
      <TablaCampo
        lista={lista}
        etiqueta="Clientes"
        columnas={[
          { titulo: "Cliente", valor: (x) => x.nombre },
          { titulo: "RUC", valor: (x) => x.ruc },
          { titulo: "Contacto", valor: (x) => `${x.contacto} ${x.telefono}` },
          {
            titulo: "Estado",
            valor: (x) => (x.activo ? "Activo" : "Inactivo"),
          },
        ]}
        acciones={(x) => (
          <button className={btnGhost} onClick={() => setForm(x)}>
            Editar
          </button>
        )}
      />
      <Modal
        titulo={form?.id ? "Editar cliente" : "Crear cliente"}
        abierto={!!form}
        onCerrar={() => {
          if (!op.mensaje) setForm(null);
        }}
      >
        {form ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const { id, ...data } = form;
              if (
                await op.ejecutar("Guardando cliente", () =>
                  apiFetch(`/campo/clientes${id ? `/${id}` : ""}`, {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(data),
                  }),
                )
              ) {
                setForm(null);
                lista.refrescar();
              }
            }}
          >
            <CampoTexto
              titulo="Nombre"
              value={form.nombre}
              required
              onChange={(nombre) => setForm({ ...form, nombre })}
            />
            <CampoTexto
              titulo="RUC"
              value={form.ruc}
              maxLength={30}
              onChange={(ruc) => setForm({ ...form, ruc })}
            />
            <CampoTexto
              titulo="Contacto"
              value={form.contacto}
              onChange={(contacto) => setForm({ ...form, contacto })}
            />
            <CampoTexto
              titulo="Teléfono"
              value={form.telefono}
              maxLength={40}
              onChange={(telefono) => setForm({ ...form, telefono })}
            />
            <CampoActivo
              value={form.activo}
              onChange={(activo) => setForm({ ...form, activo })}
            />
            {op.error ? <p className={errorBox}>{op.error}</p> : null}
            <BotonesFormulario
              ocupado={!!op.mensaje}
              cancelar={() => setForm(null)}
            />
          </form>
        ) : null}
      </Modal>
      <PantallaCarga visible={!!op.mensaje} mensaje={op.mensaje} />
    </>
  );
}

export function LocalesPanel() {
  const lista = useListaCampo<LocalCampo>("/campo/locales");
  const op = useOperacionCampo();
  const [form, setForm] = useState<LocalCampo | null>(null);
  const [plan, setPlan] = useState<LocalCampo | null>(null);
  const [mapa, setMapa] = useState<LocalCampo | null>(null);
  return (
    <>
      <CabeceraCampo
        titulo="Locales"
        detalle="Ubicación, franjas de atención y asignaciones de tu equipo."
        crear={() =>
          setForm({
            id: 0,
            clienteId: 0,
            cliente: { id: 0, nombre: "" },
            nombre: "",
            direccion: "",
            contacto: "",
            telefono: "",
            latitud: -25.3,
            longitud: -57.6,
            notas: "",
            activo: true,
          })
        }
      />
      <TablaCampo
        lista={lista}
        etiqueta="Locales"
        columnas={[
          { titulo: "Local", valor: (x) => x.nombre },
          { titulo: "Cliente", valor: (x) => x.cliente.nombre },
          { titulo: "Dirección", valor: (x) => x.direccion },
          {
            titulo: "Estado",
            valor: (x) => (x.activo ? "Activo" : "Inactivo"),
          },
        ]}
        acciones={(x) => (
          <>
            <button className={btnGhost} onClick={() => setForm(x)}>
              Editar
            </button>
            <button className={btnGhost} onClick={() => setPlan(x)}>
              Horarios y equipo
            </button>
            <button className={btnGhost} onClick={() => setMapa(x)}>
              Mapa
            </button>
          </>
        )}
      />
      <Modal
        titulo={form?.id ? "Editar local" : "Crear local"}
        abierto={!!form}
        onCerrar={() => {
          if (!op.mensaje) setForm(null);
        }}
        ancho="lg"
      >
        {form ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const {
                id,
                clienteId,
                nombre,
                direccion,
                contacto,
                telefono,
                latitud,
                longitud,
                notas,
                activo,
              } = form;
              const data = {
                clienteId,
                nombre,
                direccion,
                contacto,
                telefono,
                latitud,
                longitud,
                notas,
                activo,
              };
              if (
                await op.ejecutar("Guardando local", () =>
                  apiFetch(`/campo/locales${id ? `/${id}` : ""}`, {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(data),
                  }),
                )
              ) {
                setForm(null);
                lista.refrescar();
              }
            }}
          >
            <SelectorPaginado
              url="/campo/clientes"
              buscable
              etiqueta="Cliente"
              value={form.clienteId || ""}
              required
              seleccionActual={form.cliente.nombre}
              onChange={(id) => setForm({ ...form, clienteId: Number(id) })}
            />
            <CampoTexto
              titulo="Nombre"
              value={form.nombre}
              required
              onChange={(nombre) => setForm({ ...form, nombre })}
            />
            <CampoTexto
              titulo="Dirección"
              value={form.direccion}
              maxLength={250}
              onChange={(direccion) => setForm({ ...form, direccion })}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <CampoTexto
                titulo="Latitud"
                type="number"
                step="any"
                min={-90}
                max={90}
                required
                value={form.latitud}
                onChange={(v) => setForm({ ...form, latitud: Number(v) })}
              />
              <CampoTexto
                titulo="Longitud"
                type="number"
                step="any"
                min={-180}
                max={180}
                required
                value={form.longitud}
                onChange={(v) => setForm({ ...form, longitud: Number(v) })}
              />
            </div>
            <SelectorUbicacion
              latitud={form.latitud}
              longitud={form.longitud}
              onChange={(latitud, longitud) =>
                setForm((actual) =>
                  actual ? { ...actual, latitud, longitud } : actual,
                )
              }
            />
            <CampoTexto
              titulo="Contacto"
              value={form.contacto}
              onChange={(contacto) => setForm({ ...form, contacto })}
            />
            <CampoTexto
              titulo="Teléfono"
              value={form.telefono}
              maxLength={40}
              onChange={(telefono) => setForm({ ...form, telefono })}
            />
            <CampoTexto
              titulo="Notas"
              value={form.notas}
              maxLength={1000}
              onChange={(notas) => setForm({ ...form, notas })}
            />
            <CampoActivo
              value={form.activo}
              onChange={(activo) => setForm({ ...form, activo })}
            />
            {op.error ? <p className={errorBox}>{op.error}</p> : null}
            <BotonesFormulario
              ocupado={!!op.mensaje}
              cancelar={() => setForm(null)}
            />
          </form>
        ) : null}
      </Modal>
      {plan ? <PlanLocal local={plan} cerrar={() => setPlan(null)} /> : null}
      {mapa ? <MapaLocal local={mapa} cerrar={() => setMapa(null)} /> : null}
      <PantallaCarga visible={!!op.mensaje} mensaje={op.mensaje} />
    </>
  );
}
