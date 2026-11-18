"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const LARGO = 6;
const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "borrar", "0", "entrar"] as const;

export default function TecladoPin({ configurado }: { configurado: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(
    configurado ? null : "Falta conectar Supabase (variables de entorno).",
  );
  const [enviando, setEnviando] = useState(false);
  const [sacudir, setSacudir] = useState(false);
  const enviandoRef = useRef(false);
  // Valor actual sin esperar al render (el teclado físico puede mandar varias teclas seguidas).
  const pinRef = useRef("");
  const ponerPin = useCallback((v: string) => {
    pinRef.current = v;
    setPin(v);
  }, []);

  const enviar = useCallback(
    async (valor: string) => {
      if (enviandoRef.current || valor.length !== LARGO) return;
      enviandoRef.current = true;
      setEnviando(true);
      setError(null);
      try {
        const r = await fetch("/api/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: valor }),
        });
        const datos = (await r.json().catch(() => ({}))) as { error?: string };
        if (!r.ok) {
          setError(datos.error ?? "No se pudo entrar.");
          ponerPin("");
          setSacudir(true);
          setTimeout(() => setSacudir(false), 400);
          return;
        }
        router.replace("/imprimir");
        router.refresh();
      } catch {
        setError("Sin conexión. Revisa el internet e intenta otra vez.");
        ponerPin("");
      } finally {
        enviandoRef.current = false;
        setEnviando(false);
      }
    },
    [router, ponerPin],
  );

  const teclear = useCallback(
    (t: string) => {
      if (enviandoRef.current) return;
      const actual = pinRef.current;
      if (t === "borrar") return ponerPin(actual.slice(0, -1));
      if (t === "entrar") return void enviar(actual);
      if (actual.length >= LARGO) return;
      setError(null);
      const nuevo = actual + t;
      ponerPin(nuevo);
      if (nuevo.length === LARGO) void enviar(nuevo); // al completar los 6 números se manda solo
    },
    [enviar, ponerPin],
  );

  // Teclado físico (PC del mostrador)
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) teclear(e.key);
      else if (e.key === "Backspace") teclear("borrar");
      else if (e.key === "Enter") teclear("entrar");
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [teclear]);

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`flex justify-center gap-3 ${sacudir ? "sacudir" : ""}`}
        aria-label={`${pin.length} de ${LARGO} números`}
        role="status"
      >
        {Array.from({ length: LARGO }, (_, i) => (
          <span
            key={i}
            className={`size-5 rounded-full border-2 transition-colors ${
              i < pin.length ? "border-tinta bg-tinta" : "border-borde-input bg-white"
            }`}
          />
        ))}
      </div>

      <p className={`min-h-6 text-center text-base font-semibold ${error ? "text-enlace" : "text-apagado"}`}>
        {error ?? (enviando ? "Entrando…" : "Escribe tu PIN de 6 números")}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {TECLAS.map((t) => {
          const esAccion = t === "borrar" || t === "entrar";
          return (
            <button
              key={t}
              type="button"
              disabled={enviando || (t === "entrar" && pin.length !== LARGO)}
              onClick={() => teclear(t)}
              className={`h-16 rounded-2xl text-2xl font-bold transition-colors disabled:opacity-40 ${
                t === "entrar"
                  ? "bg-acento text-lg text-white hover:bg-acento-hover"
                  : esAccion
                    ? "border border-borde bg-white text-lg font-semibold text-texto-2 hover:bg-fondo"
                    : "border border-borde bg-white hover:bg-fondo active:bg-chip"
              }`}
              aria-label={t === "borrar" ? "Borrar" : t === "entrar" ? "Entrar" : t}
            >
              {t === "borrar" ? "Borrar" : t === "entrar" ? "Entrar" : t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
