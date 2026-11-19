"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Icono from "@/components/Icono";

/**
 * Escanear con la cámara del celular. Usa el detector nativo del navegador (Chrome en Android)
 * y, si no existe (iPhone), zxing en WebAssembly servido desde /zxing.
 * Modo continuo: cada código leído se agrega (el mismo código se ignora 2 s para no duplicar).
 */

type Detector = (fuente: HTMLVideoElement, lienzo: HTMLCanvasElement) => Promise<string | null>;

interface BarcodeDetectorLike {
  detect(fuente: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: {
      new (opciones: { formats: string[] }): BarcodeDetectorLike;
      getSupportedFormats(): Promise<string[]>;
    };
  }
}

async function crearDetector(): Promise<Detector> {
  if (window.BarcodeDetector) {
    try {
      const formatos = await window.BarcodeDetector.getSupportedFormats();
      if (formatos.includes("code_128")) {
        const nativo = new window.BarcodeDetector({ formats: ["code_128"] });
        return async (video) => (await nativo.detect(video))[0]?.rawValue ?? null;
      }
    } catch {
      /* se usa zxing */
    }
  }
  const zxing = await import("zxing-wasm/reader");
  zxing.prepareZXingModule({
    overrides: { locateFile: (ruta: string, prefijo: string) => (ruta.endsWith(".wasm") ? "/zxing/zxing_reader.wasm" : prefijo + ruta) },
  });
  return async (video, lienzo) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    // solo la franja central (donde está la guía): más rápido y menos falsos
    const fh = Math.round(h * 0.4);
    lienzo.width = w;
    lienzo.height = fh;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, (h - fh) / 2, w, fh, 0, 0, w, fh);
    const r = await zxing.readBarcodes(ctx.getImageData(0, 0, w, fh), { formats: ["Code128"], tryHarder: true, maxNumberOfSymbols: 1 });
    return r.find((x) => x.isValid)?.text ?? null;
  };
}

const sinSuscripcion = () => () => {};

export default function EscanerCamara({ onCodigo }: { onCodigo: (codigo: string) => void }) {
  // cualquier navegador que pueda usar la cámara (requiere https; en la PC el botón se oculta por CSS)
  const disponible = useSyncExternalStore(
    sinSuscripcion,
    () => !!navigator.mediaDevices?.getUserMedia,
    () => false,
  );
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<"iniciando" | "buscando" | "error">("iniciando");
  const [ultimo, setUltimo] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const recientes = useRef(new Map<string, number>());

  const leido = useCallback(
    (codigo: string) => {
      const ahora = Date.now();
      if ((recientes.current.get(codigo) ?? 0) > ahora - 2000) return;
      recientes.current.set(codigo, ahora);
      navigator.vibrate?.(60);
      setUltimo(codigo);
      onCodigo(codigo);
    },
    [onCodigo],
  );

  useEffect(() => {
    if (!abierto) return;
    let flujo: MediaStream | null = null;
    let vivo = true;
    let espera: ReturnType<typeof setTimeout>;
    (async () => {
      try {
        setEstado("iniciando");
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!vivo || !video.current) return;
        video.current.srcObject = flujo;
        await video.current.play();
        const detectar = await crearDetector();
        setEstado("buscando");
        const ciclo = async () => {
          if (!vivo || !video.current || !lienzo.current) return;
          try {
            const c = await detectar(video.current, lienzo.current);
            if (c) leido(c);
          } catch {
            /* cuadro sin código */
          }
          espera = setTimeout(ciclo, 120);
        };
        void ciclo();
      } catch (e) {
        console.error(e);
        if (vivo) setEstado("error");
      }
    })();
    return () => {
      vivo = false;
      clearTimeout(espera);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [abierto, leido]);

  if (!disponible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setUltimo(null);
          setAbierto(true);
        }}
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-tinta text-lg font-bold text-white active:bg-[#333] lg:hidden"
      >
        <Icono nombre="camara" tam={24} trazo={2} />
        Escanear con cámara
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label="Escanear con la cámara">
          <div className="relative flex-1 overflow-hidden">
            <video ref={video} playsInline muted className="absolute inset-0 size-full object-cover" />
            {/* guía */}
            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-[28%] -translate-y-1/2 rounded-2xl border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,.45)]" />
            <canvas ref={lienzo} className="hidden" />
          </div>
          <div className="flex flex-col gap-3 bg-black px-5 pb-8 pt-4">
            <p className="text-center text-lg font-semibold">
              {estado === "error"
                ? "No se pudo abrir la cámara. Revisa que Chrome tenga permiso."
                : estado === "iniciando"
                  ? "Abriendo cámara…"
                  : ultimo
                    ? `Agregado: ${ultimo}. Sigue escaneando.`
                    : "Pon el código de barras dentro del recuadro"}
            </p>
            <button type="button" onClick={() => setAbierto(false)} className="h-14 rounded-2xl bg-acento text-lg font-bold">
              Listo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
