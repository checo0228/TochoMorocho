"use client";

import { useCallback, useRef, useState } from "react";
import Icono from "./Icono";

export function useToast() {
  const [toast, setToast] = useState<{ texto: string; error?: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const avisar = useCallback((texto: string, error = false) => {
    clearTimeout(timer.current);
    setToast({ texto, error });
    timer.current = setTimeout(() => setToast(null), error ? 5000 : 2400);
  }, []);
  return { toast, avisar };
}

export function Toast({ toast, abajo = "bottom-7" }: { toast: { texto: string; error?: boolean } | null; abajo?: string }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed left-1/2 z-40 flex max-w-[92%] -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-tinta py-3.5 pl-4 pr-[22px] text-[17px] font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,.25)] ${abajo}`}
    >
      <span className={`flex size-7 flex-none items-center justify-center rounded-full ${toast.error ? "bg-[#b83a1d]" : "bg-acento"}`}>
        <Icono nombre={toast.error ? "alerta" : "palomita"} tam={16} trazo={3} />
      </span>
      <span className="truncate">{toast.texto}</span>
    </div>
  );
}
