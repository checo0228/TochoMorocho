"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import Icono from "@/components/Icono";
import RenglonCatalogo from "./RenglonCatalogo";
import ModalProducto from "@/components/producto/ModalProducto";
import { Toast, useToast } from "@/components/Toast";
import { supabaseNavegador } from "@/lib/supabase/client";
import { actualizarProducto, agregarALista, agregarVariosALista, cargarLista, type CambiosProducto } from "@/lib/datos";
import { FILTROS_INICIALES, filtrarCatalogo, hayFiltro, separarParaImprimir, type FiltrosCatalogo } from "@/lib/filtrar-catalogo";
import type { Producto, RenglonLista } from "@/lib/tipos";

interface Props {
  productosIniciales: Producto[];
  listaInicial: RenglonLista[];
  categorias: string[];
}

const PASO = 60;

export default function PantallaCatalogo({ productosIniciales, listaInicial, categorias: categoriasIniciales }: Props) {
  const sb = supabaseNavegador();
  const [productos, setProductos] = useState(productosIniciales);
  const [lista, setLista] = useState(() => new Map(listaInicial.map((r) => [r.codigo, r.cantidad])));
  const [categorias, setCategorias] = useState(categoriasIniciales);
  const [f, setF] = useState<FiltrosCatalogo>(FILTROS_INICIALES);
  const [limite, setLimite] = useState(PASO);
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [confirmarGrupo, setConfirmarGrupo] = useState(false);
  /** Recién cambiados de tamaño: no desaparecen de la lista hasta cambiar de filtro. */
  const [mantener, setMantener] = useState<Set<string>>(() => new Set());
  const { toast, avisar } = useToast();

  const porCodigo = useMemo(() => new Map(productos.map((p) => [p.codigo.toUpperCase(), p])), [productos]);
  const filtrados = useMemo(() => filtrarCatalogo(productos, f, mantener), [productos, f, mantener]);
  const visibles = filtrados.slice(0, limite);
  const filtro = hayFiltro(f);
  const sinTamanoActivos = useMemo(() => productos.filter((p) => p.activo && !p.tamano && !p.oculto).length, [productos]);
  const ocultos = useMemo(() => productos.filter((p) => p.oculto).length, [productos]);
  const pendientes = useMemo(() => productos.filter((p) => p.pendiente_multicomercio).length, [productos]);
  const grupo = useMemo(() => separarParaImprimir(filtrados), [filtrados]);

  const cambiarFiltro = (cambios: Partial<FiltrosCatalogo>) => {
    setF((x) => ({ ...x, ...cambios }));
    setLimite(PASO);
    setConfirmarGrupo(false);
    setMantener(new Set());
  };

  // la lista cambia desde otros equipos: se refresca al volver a la pestaña
  useEffect(() => {
    const alVolver = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        setLista(new Map((await cargarLista(sb)).map((r) => [r.codigo, r.cantidad])));
      } catch (e) {
        console.error(e);
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [sb]);

  const cambiar = useCallback(
    async (codigo: string, cambios: CambiosProducto) => {
      if (cambios.tamano) setMantener((m) => new Set(m).add(codigo));
      let antes: Producto | undefined;
      setProductos((ps) =>
        ps.map((p) => {
          if (p.codigo !== codigo) return p;
          antes = p;
          return { ...p, ...cambios };
        }),
      );
      try {
        await actualizarProducto(sb, codigo, cambios);
        avisar("Guardado");
      } catch (e) {
        console.error(e);
        if (antes) setProductos((ps) => ps.map((p) => (p.codigo === codigo ? antes! : p)));
        avisar(e instanceof Error ? e.message : "No se pudo guardar.", true);
      }
    },
    [sb, avisar],
  );

  const agregar = useCallback(
    async (p: Producto) => {
      setLista((m) => new Map(m).set(p.codigo, (m.get(p.codigo) ?? 0) + 1));
      try {
        const n = await agregarALista(sb, p.codigo, 1);
        setLista((m) => new Map(m).set(p.codigo, n));
        avisar(`${p.nombre || p.codigo} · ${n} ${n === 1 ? "pieza" : "piezas"}${p.tamano ? "" : " (falta tamaño)"}`);
      } catch (e) {
        console.error(e);
        setLista((m) => {
          const c = new Map(m);
          const v = (c.get(p.codigo) ?? 1) - 1;
          if (v > 0) c.set(p.codigo, v);
          else c.delete(p.codigo);
          return c;
        });
        avisar("No se pudo agregar.", true);
      }
    },
    [sb, avisar],
  );

  const agregarGrupo = async () => {
    setConfirmarGrupo(false);
    const items = grupo.imprimibles.map((p) => ({ codigo: p.codigo, cantidad: 1 }));
    try {
      await agregarVariosALista(sb, items);
      setLista(new Map((await cargarLista(sb)).map((r) => [r.codigo, r.cantidad])));
      avisar(`${items.length.toLocaleString("es-MX")} productos agregados a la impresión`);
    } catch (e) {
      console.error(e);
      avisar("No se pudieron agregar.", true);
    }
  };

  const descGrupo = f.categoria ? `de ${f.categoria}` : "de esta búsqueda";

  return (
    <div className="flex flex-col gap-4 px-4 py-5 md:px-10 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="titulo text-[34px] md:text-[52px]">CATÁLOGO</h1>
          <div className="text-base text-apagado">{productos.length.toLocaleString("es-MX")} productos</div>
        </div>
        <button
          type="button"
          onClick={() => setNuevo(true)}
          className="flex h-[52px] items-center gap-2 rounded-[14px] bg-acento px-5 text-[17px] font-bold text-white hover:bg-acento-hover"
        >
          + Producto nuevo
        </button>
      </div>

      {sinTamanoActivos > 0 && f.tamano !== "sin" && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-suave px-4 py-3 text-[#7a2410]">
          <Icono nombre="alerta" tam={22} className="text-enlace" />
          <div className="flex-[1_1_240px] text-base">
            <b>{sinTamanoActivos} productos activos sin tamaño.</b> No se pueden imprimir hasta elegir Grande o Chica.
          </div>
          <button type="button" onClick={() => cambiarFiltro({ ...FILTROS_INICIALES, tamano: "sin" })} className="h-11 rounded-xl bg-tinta px-4 text-[15px] font-bold text-white">
            Ver y asignar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col gap-3 rounded-[18px] border border-borde bg-white p-4">
        <div className="flex flex-wrap gap-2.5">
          <div className="relative flex-[1_1_300px]">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-apagado">
              <Icono nombre="buscar" tam={22} />
            </div>
            <input
              value={f.q}
              onChange={(e) => cambiarFiltro({ q: e.target.value })}
              placeholder="Buscar por nombre o código"
              aria-label="Buscar por nombre o código"
              className="h-[54px] w-full rounded-[14px] border-2 border-borde-input bg-white pl-[50px] pr-4 text-lg font-medium text-tinta outline-none focus:border-tinta"
            />
          </div>
          <select
            value={f.categoria}
            onChange={(e) => cambiarFiltro({ categoria: e.target.value })}
            aria-label="Categoría"
            className="h-[54px] flex-[0_1_240px] rounded-[14px] border-2 border-borde-input bg-white px-3.5 text-[17px] font-medium text-tinta"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
          <Segmento
            opciones={[
              ["todos", "Todos"],
              ["grande", "Grande"],
              ["chica", "Chica"],
              ["sin", "Sin tamaño"],
            ]}
            valor={f.tamano}
            onCambio={(v) => cambiarFiltro({ tamano: v })}
          />
          <Segmento
            opciones={[
              ["activos", "Activos"],
              ["inactivos", "Inactivos"],
              ["ocultos", `Ocultos (${ocultos})`],
              ["todos", "Todos"],
            ]}
            valor={f.estado}
            onCambio={(v) => cambiarFiltro({ estado: v })}
          />
          <button
            type="button"
            onClick={() => cambiarFiltro({ pendientes: !f.pendientes })}
            aria-pressed={f.pendientes}
            className={`flex h-12 items-center gap-2 rounded-full border-2 px-4 text-[15px] font-semibold text-tinta ${f.pendientes ? "border-acento bg-suave" : "border-borde-input bg-white"}`}
          >
            <span className={`flex size-5 items-center justify-center rounded-md border-2 ${f.pendientes ? "border-acento bg-acento text-white" : "border-borde-input bg-white"}`}>
              {f.pendientes && <Icono nombre="palomita" tam={14} trazo={3} />}
            </span>
            Pendientes en Multicomercio ({pendientes})
          </button>
          {filtro && (
            <button type="button" onClick={() => cambiarFiltro(FILTROS_INICIALES)} className="text-[15px] font-semibold text-enlace underline">
              Quitar filtros
            </button>
          )}
        </div>
      </div>

      {/* Imprimir el grupo (p. ej. toda una categoría) */}
      {filtro && grupo.imprimibles.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-borde bg-white px-4 py-3">
          <Icono nombre="impresora" tam={22} />
          {confirmarGrupo ? (
            <>
              <div className="flex-[1_1_260px] text-base">
                Se agregan <b>{grupo.imprimibles.length.toLocaleString("es-MX")}</b> productos con 1 pieza cada uno.
                {grupo.sinTamano > 0 && <> {grupo.sinTamano} sin tamaño no se agregan.</>}
                {grupo.inactivos > 0 && <> {grupo.inactivos} inactivos no se agregan.</>}
              </div>
              <button type="button" onClick={() => setConfirmarGrupo(false)} className="h-11 rounded-xl border border-borde-input px-4 text-[15px] font-semibold">
                No
              </button>
              <button type="button" onClick={() => void agregarGrupo()} className="h-11 rounded-xl bg-acento px-4 text-[15px] font-bold text-white">
                Sí, agregar
              </button>
            </>
          ) : (
            <>
              <div className="flex-[1_1_260px] text-base">
                ¿Imprimir todos los productos {descGrupo}? ({grupo.imprimibles.length.toLocaleString("es-MX")} con tamaño)
              </div>
              <button type="button" onClick={() => setConfirmarGrupo(true)} className="h-11 rounded-xl bg-tinta px-4 text-[15px] font-bold text-white">
                Agregar a impresión
              </button>
            </>
          )}
        </div>
      )}

      {/* Lista */}
      {visibles.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {visibles.map((p) => (
            <RenglonCatalogo key={p.codigo} p={p} enLista={lista.get(p.codigo) ?? 0} onCambiar={cambiar} onAgregar={agregar} onEditar={setEditando} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2.5 px-4 py-12 text-center">
          <Image src="/marca/panda.png" alt="" width={120} height={120} className="w-[120px] opacity-90 mix-blend-multiply" />
          <div className="text-xl font-bold">No hay productos con esos filtros</div>
          <button type="button" onClick={() => cambiarFiltro(FILTROS_INICIALES)} className="text-base font-semibold text-enlace underline">
            Quitar filtros
          </button>
        </div>
      )}
      <div className="flex flex-col items-center gap-3 pb-1 pt-2.5 text-center text-[15px] text-apagado">
        {filtrados.length > visibles.length ? (
          <>
            Mostrando {visibles.length.toLocaleString("es-MX")} de {filtrados.length.toLocaleString("es-MX")}.
            <button type="button" onClick={() => setLimite((l) => l + PASO * 3)} className="h-11 rounded-xl border border-borde-input bg-white px-5 font-semibold text-texto-2 hover:bg-fondo">
              Mostrar más
            </button>
          </>
        ) : (
          filtrados.length > 0 && <>{filtrados.length === 1 ? "1 resultado" : `${filtrados.length.toLocaleString("es-MX")} resultados`}</>
        )}
      </div>

      {nuevo && (
        <ModalProducto
          categorias={categorias}
          existe={(c) => porCodigo.get(c.toUpperCase())}
          onCerrar={() => setNuevo(false)}
          onCreado={(p) => {
            setProductos((ps) => [...ps, p]);
            setLista((m) => new Map(m).set(p.codigo, 1));
            if (p.categoria && !categorias.includes(p.categoria)) setCategorias((c) => [...c, p.categoria!].sort());
            setNuevo(false);
            avisar(`Creado y agregado a la impresión: ${p.nombre}`);
          }}
          onAgregarExistente={(p) => {
            setNuevo(false);
            void agregar(p);
          }}
        />
      )}
      {editando && (
        <ModalProducto
          editar={editando}
          categorias={categorias}
          existe={(c) => porCodigo.get(c.toUpperCase())}
          onCerrar={() => setEditando(null)}
          onGuardado={(p) => {
            setProductos((ps) => ps.map((x) => (x.codigo === p.codigo ? p : x)));
            if (p.categoria && !categorias.includes(p.categoria)) setCategorias((c) => [...c, p.categoria!].sort());
            avisar(p.oculto !== editando.oculto ? (p.oculto ? `Oculto: ${p.nombre || p.codigo}` : `Visible otra vez: ${p.nombre || p.codigo}`) : "Cambios guardados");
            setEditando(null);
          }}
          onEliminado={(codigo) => {
            setProductos((ps) => ps.filter((x) => x.codigo !== codigo));
            setLista((m) => {
              const c = new Map(m);
              c.delete(codigo);
              return c;
            });
            avisar("Producto eliminado");
            setEditando(null);
          }}
        />
      )}
      <Toast toast={toast} />
    </div>
  );
}

function Segmento<T extends string>({ opciones, valor, onCambio }: { opciones: [T, string][]; valor: T; onCambio: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-[#f3efe8] p-1" role="group">
      {opciones.map(([v, etiqueta]) => (
        <button
          key={v}
          type="button"
          onClick={() => onCambio(v)}
          aria-pressed={valor === v}
          className={`h-10 whitespace-nowrap rounded-full px-3 text-[15px] font-semibold sm:px-3.5 ${valor === v ? "bg-white text-tinta shadow-[0_1px_3px_rgba(0,0,0,.12)]" : "text-apagado-2"}`}
        >
          {etiqueta}
        </button>
      ))}
    </div>
  );
}
