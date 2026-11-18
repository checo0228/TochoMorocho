import Image from "next/image";
import TecladoPin from "./TecladoPin";
import { supabaseConfigurado } from "@/lib/supabase/env";

export const metadata = { title: "Entrar · Etiquetas" };

export default function Entrar() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-8">
      <div className="flex w-full max-w-[440px] flex-col items-center gap-7">
        <Image
          src="/marca/logo.png"
          alt="De Tocho Morocho"
          width={822}
          height={648}
          priority
          className="h-auto w-[240px] max-w-[70%] mix-blend-multiply"
        />
        <div className="flex w-full flex-col gap-5 rounded-[22px] border border-borde bg-white p-6 shadow-[0_12px_40px_rgba(17,17,17,.06)] sm:p-8">
          <div className="flex flex-col gap-1">
            <h1 className="titulo text-[30px] leading-[1.1]">ENTRAR A ETIQUETAS</h1>
            <p className="text-base text-apagado">Solo para el equipo de la tienda.</p>
          </div>
          <TecladoPin configurado={supabaseConfigurado()} />
        </div>
      </div>
    </main>
  );
}
