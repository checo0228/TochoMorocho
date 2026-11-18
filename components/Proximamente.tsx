export default function Proximamente({ titulo, fase, texto }: { titulo: string; fase: number; texto: string }) {
  return (
    <div className="flex flex-col gap-[18px] px-4 py-5 md:px-10 md:py-8">
      <h1 className="titulo text-[34px] md:text-[52px]">{titulo}</h1>
      <div className="flex max-w-2xl flex-col gap-2 rounded-[18px] border border-borde bg-white p-6">
        <p className="text-lg font-bold">Llega en la fase {fase}</p>
        <p className="text-base leading-relaxed text-texto-2">{texto}</p>
      </div>
    </div>
  );
}
