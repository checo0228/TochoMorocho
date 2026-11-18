"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Rol } from "@/lib/roles";

interface Pestana {
  ruta: string;
  etiqueta: string;
  insignia?: number;
  /** Sincronizar usa insignia roja siempre (pendientes). */
  alerta?: boolean;
}

export default function Encabezado({
  rol,
  enLista,
  pendientes,
}: {
  rol: Rol;
  enLista: number;
  pendientes: number;
}) {
  const ruta = usePathname();
  const pestanas: Pestana[] = [{ ruta: "/imprimir", etiqueta: "Imprimir", insignia: enLista }];
  if (rol === "admin") {
    pestanas.push(
      { ruta: "/catalogo", etiqueta: "Catálogo" },
      { ruta: "/sincronizar", etiqueta: "Sincronizar", insignia: pendientes, alerta: true },
    );
  }

  const salir = (
    <form action="/salir" method="post">
      <button
        type="submit"
        className="h-10 rounded-[10px] border border-borde bg-white px-3 text-[15px] font-medium text-texto-2 hover:bg-fondo md:h-11 md:rounded-xl md:px-4 md:text-base"
      >
        Salir
      </button>
    </form>
  );

  return (
    <header className="flex-none border-b border-borde bg-white">
      <div className="flex flex-col gap-2.5 px-4 pb-2.5 pt-3 md:h-[76px] md:flex-row md:items-center md:gap-[22px] md:px-7 md:py-0">
        <div className="flex items-center gap-2.5 md:gap-3">
          <Image
            src="/marca/wordmark.png"
            alt="De Tocho Morocho"
            width={822}
            height={336}
            priority
            className="h-7 w-auto mix-blend-multiply md:h-[38px]"
          />
          <span className="titulo rounded bg-tinta px-[7px] pb-[3px] pt-1 text-xs tracking-[1px] text-white md:rounded-[5px] md:px-[9px] md:pb-1 md:pt-[5px] md:text-[15px] md:tracking-[1.2px]">
            ETIQUETAS
          </span>
          <div className="flex-1 md:hidden" />
          <div className="md:hidden">{salir}</div>
        </div>

        <nav className="flex gap-1 md:ml-3 md:gap-1.5" aria-label="Secciones">
          {pestanas.map((p) => {
            const activa = ruta === p.ruta || ruta.startsWith(p.ruta + "/");
            const conInsignia = (p.insignia ?? 0) > 0;
            return (
              <Link
                key={p.ruta}
                href={p.ruta}
                aria-current={activa ? "page" : undefined}
                className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-1.5 text-[15px] font-semibold no-underline md:h-[50px] md:flex-none md:gap-[9px] md:px-5 md:text-[17px] ${
                  activa ? "bg-tinta text-white hover:text-white" : "text-texto-2 hover:bg-fondo hover:text-tinta"
                }`}
              >
                {p.etiqueta}
                {conInsignia && (
                  <span
                    className={`inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[13px] font-bold md:h-[26px] md:min-w-[26px] md:px-2 md:text-sm ${
                      activa || p.alerta ? "bg-acento text-white" : "bg-chip text-tinta"
                    }`}
                  >
                    {p.insignia}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden flex-1 md:block" />
        <div className="hidden md:block">{salir}</div>
      </div>
    </header>
  );
}
