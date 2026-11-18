"use client";

import { useState } from "react";
import Icono from "@/components/Icono";
import VistaEtiqueta from "@/components/etiquetas/VistaEtiqueta";
import type { Etiqueta } from "@/lib/etiquetas/pdf";
import { CHICA, GRANDE } from "@/lib/etiquetas/spec";
import type { Tamano } from "@/lib/tipos";

export interface Resumen {
  grandes: number;
  chicas: number;
  hileras: number;
  sinTamano: number;
  noCaben: number;
  muestraGrande?: Etiqueta;
  muestraChicas: Etiqueta[];
}

interface Props {
  r: Resumen;
  generando: Tamano | null;
  hayRenglones: boolean;
  onDescargar: (t: Tamano) => void;
  onVaciar: () => void;
}

const plural = (n: number, s: string, p: string) => `${n.toLocaleString("es-MX")} ${n === 1 ? s : p}`;
const hilerasTxt = (n: number) => plural(n, "hilera", "hileras");
const avisoSinTamano = (n: number) => (n === 1 ? "1 producto sin tamaño." : `${n} productos sin tamaño.`);

function BotonDescarga({ t, r, generando, onDescargar, corto }: { t: Tamano; r: Resumen; generando: Tamano | null; onDescargar: (t: Tamano) => void; corto?: boolean }) {
  const n = t === "grande" ? r.grandes : r.chicas;
  const txt = corto ? (t === "grande" ? "PDF grandes" : "PDF chicas") : t === "grande" ? "Descargar PDF grandes" : "Descargar PDF chicas";
  return (
    <button
      type="button"
      onClick={() => onDescargar(t)}
      disabled={n === 0 || generando !== null}
      className={`flex items-center justify-center gap-2 rounded-2xl bg-acento font-bold text-white hover:bg-acento-hover disabled:opacity-40 disabled:hover:bg-acento ${
        corto ? "h-[54px] rounded-[14px] text-base" : "h-[62px] text-[19px]"
      }`}
    >
      <Icono nombre="descargar" tam={22} trazo={2.4} />
      {generando === t ? "Generando…" : txt}
    </button>
  );
}

function ConfirmarVaciar({ onSi, onNo }: { onSi: () => void; onNo: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-[14px] bg-tinta py-2.5 pl-4 pr-2.5 text-white">
      <div className="flex-1 text-base font-semibold">¿Quitar todo de la lista?</div>
      <button type="button" onClick={onNo} className="h-[42px] rounded-[10px] border border-[#555] px-3.5 text-[15px] font-semibold">
        No
      </button>
      <button type="button" onClick={onSi} className="h-[42px] rounded-[10px] bg-acento px-3.5 text-[15px] font-bold">
        Sí, vaciar
      </button>
    </div>
  );
}

export function AyudaZebra() {
  return (
    <details className="group text-sm leading-relaxed text-apagado">
      <summary className="flex cursor-pointer list-none items-start gap-2.5">
        <span className="mt-0.5 flex-none">
          <Icono nombre="impresora" tam={18} trazo={2} />
        </span>
        <span>
          <b className="text-texto-2">Configura la Zebra:</b> grande {GRANDE.presetDriver} · chica {CHICA.presetDriver} (hilera de 3).{" "}
          <span className="font-semibold text-enlace underline group-open:hidden">Ver cómo</span>
        </span>
      </summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-10 text-texto-2">
        <li>
          En el driver usa el preset <b>Grande = {GRANDE.presetDriver}</b> o <b>Chica = {CHICA.presetDriver}</b>, medio
          “Etiquetas con espacios”.
        </li>
        <li>
          Imprime siempre en <b>Tamaño real</b>, nunca “Ajustar”.
        </li>
        <li>Al cambiar de rollo: calibra (mantén el botón y suéltalo al 2.º parpadeo).</li>
        <li>
          Si se traba (se queda en “Imprimiendo” con la luz verde fija): cancela todo y reinicia la PC o la cola de impresión.{" "}
          <b>Nunca vuelvas a mandar el mismo trabajo.</b>
        </li>
      </ul>
    </details>
  );
}

/** Panel derecho (escritorio). */
export function PanelResumenEscritorio({ r, generando, hayRenglones, onDescargar, onVaciar }: Props) {
  const [confirmar, setConfirmar] = useState(false);
  return (
    <aside className="hidden w-[404px] flex-none flex-col gap-4 overflow-auto border-l border-borde bg-white px-7 pb-6 pt-7 lg:flex">
      <h2 className="titulo text-[22px] tracking-[.6px]">ESTA IMPRESIÓN</h2>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-fondo px-[18px] py-4">
          <div>
            <div className="text-lg font-bold">Grandes</div>
            <div className="text-[13px] text-apagado">38 × 25 mm</div>
          </div>
          <div className="text-right">
            <span className="text-4xl font-extrabold tracking-[-1px]">{r.grandes.toLocaleString("es-MX")}</span>{" "}
            <span className="text-base text-texto-2">etiquetas</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-fondo px-[18px] py-4">
          <div>
            <div className="text-lg font-bold">Chicas</div>
            <div className="text-[13px] text-apagado">27 × 13 mm · 3 por hilera</div>
          </div>
          <div className="text-right">
            <div>
              <span className="text-4xl font-extrabold tracking-[-1px]">{r.chicas.toLocaleString("es-MX")}</span>{" "}
              <span className="text-base text-texto-2">etiquetas</span>
            </div>
            <div className="text-[15px] font-bold text-enlace">= {hilerasTxt(r.hileras)}</div>
          </div>
        </div>
      </div>

      {r.sinTamano > 0 && (
        <Aviso>
          <b>{avisoSinTamano(r.sinTamano)}</b> Elige Grande o Chica para que salga en el PDF.
        </Aviso>
      )}
      {r.noCaben > 0 && (
        <Aviso>
          <b>{plural(r.noCaben, "código no cabe", "códigos no caben")} en su etiqueta.</b> No saldrán en el PDF; cámbialos a grande.
        </Aviso>
      )}

      <div className="flex flex-col gap-2.5">
        <BotonDescarga t="grande" r={r} generando={generando} onDescargar={onDescargar} />
        <BotonDescarga t="chica" r={r} generando={generando} onDescargar={onDescargar} />
        {hayRenglones &&
          (confirmar ? (
            <ConfirmarVaciar
              onNo={() => setConfirmar(false)}
              onSi={() => {
                setConfirmar(false);
                onVaciar();
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setConfirmar(true)}
              className="h-12 rounded-[14px] border border-borde-input bg-white text-base font-semibold text-texto-2 hover:bg-fondo"
            >
              Vaciar lista
            </button>
          ))}
      </div>

      <div className="my-1 h-px bg-borde" />
      <div className="text-sm font-bold tracking-[.4px] text-apagado">ASÍ SALEN</div>
      <div className="flex flex-col items-center gap-4 rounded-[14px] bg-[#efebe4] px-3.5 py-[18px]">
        {r.muestraGrande && <VistaEtiqueta diseno={GRANDE} etiquetas={[r.muestraGrande]} anchoPx={228} className="drop-shadow-sm" />}
        {r.muestraChicas.length > 0 && <VistaEtiqueta diseno={CHICA} etiquetas={r.muestraChicas} anchoPx={324} className="drop-shadow-sm" />}
        {!r.muestraGrande && r.muestraChicas.length === 0 && <div className="py-5 text-[15px] text-apagado">Aquí verás tus etiquetas.</div>}
      </div>
      <div className="flex-1" />
      <div className="border-t border-borde pt-3.5">
        <AyudaZebra />
      </div>
    </aside>
  );
}

/** Barra inferior fija (celular y tablet). */
export function BarraResumenCelular({ r, generando, onDescargar }: Props) {
  return (
    <div className="sticky bottom-0 z-20 flex flex-col gap-2.5 border-t border-borde bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(17,17,17,.06)] lg:hidden">
      <div className="flex items-baseline justify-between gap-2 text-[15px]">
        <span>
          <b className="text-xl">{r.grandes.toLocaleString("es-MX")}</b> grandes
        </span>
        <span>
          <b className="text-xl">{r.chicas.toLocaleString("es-MX")}</b> chicas <span className="font-bold text-enlace">= {hilerasTxt(r.hileras)}</span>
        </span>
      </div>
      {r.sinTamano > 0 && (
        <div className="rounded-[10px] bg-suave px-2.5 py-2 text-sm text-[#7a2410]">
          <b>{avisoSinTamano(r.sinTamano)}</b> Elige su tamaño.
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <BotonDescarga t="grande" r={r} generando={generando} onDescargar={onDescargar} corto />
        <BotonDescarga t="chica" r={r} generando={generando} onDescargar={onDescargar} corto />
      </div>
    </div>
  );
}

export function ConfirmarVaciarCelular({ onVaciar }: { onVaciar: () => void }) {
  const [confirmar, setConfirmar] = useState(false);
  return confirmar ? (
    <ConfirmarVaciar
      onNo={() => setConfirmar(false)}
      onSi={() => {
        setConfirmar(false);
        onVaciar();
      }}
    />
  ) : (
    <button type="button" onClick={() => setConfirmar(true)} className="whitespace-nowrap py-2 text-[15px] font-semibold text-apagado underline lg:hidden">
      Vaciar lista
    </button>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-suave px-3.5 py-3 text-[15px] leading-snug text-[#7a2410]">
      <span className="mt-px flex-none text-enlace">
        <Icono nombre="alerta" tam={20} />
      </span>
      <span>{children}</span>
    </div>
  );
}
