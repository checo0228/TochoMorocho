import { componerEtiqueta, type Etiqueta } from "@/lib/etiquetas/pdf";
import { PT_A_MM, type DisenoEtiqueta } from "@/lib/etiquetas/spec";

/**
 * Vista previa de una página de etiquetas (1 grande o una hilera de hasta 3 chicas), dibujada
 * con la MISMA composición que el PDF. Si un código no cabe, muestra el aviso en su lugar.
 */
export default function VistaEtiqueta({
  diseno,
  etiquetas,
  anchoPx,
  className,
}: {
  diseno: DisenoEtiqueta;
  etiquetas: Etiqueta[];
  anchoPx: number;
  className?: string;
}) {
  const { ancho, alto } = diseno.pagina;
  const piezas = etiquetas.slice(0, diseno.columnasX.length).map((e, j) => {
    const ox = diseno.columnasX[j];
    try {
      return { ox, c: componerEtiqueta(diseno, e, ox), error: null as string | null };
    } catch {
      return { ox, c: null, error: "Código muy largo" };
    }
  });
  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      width={anchoPx}
      height={(anchoPx * alto) / ancho}
      className={className}
      role="img"
      aria-label={`Vista previa: ${etiquetas.map((e) => e.codigo).join(", ")}`}
      style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
    >
      {/* papel: cada etiqueta en blanco */}
      {diseno.columnasX.map((x) => (
        <rect key={x} x={x} y={0} width={diseno.etiqueta.ancho} height={diseno.etiqueta.alto} rx={0.6} fill="#fff" />
      ))}
      {piezas.map(({ ox, c, error }) =>
        error || !c ? (
          <text key={ox} x={ox + diseno.etiqueta.ancho / 2} y={alto / 2} fontSize={2.2} textAnchor="middle" fill="#b83a1d" fontWeight={700}>
            {error}
          </text>
        ) : (
          <g key={ox} fill="#000">
            {c.barras.map(([x, y, w, h], i) => (
              <rect key={i} x={x} y={y} width={w} height={h} />
            ))}
            {c.textos.map((t, i) => (
              <text key={i} x={t.x} y={t.y} fontSize={t.pt * PT_A_MM} fontWeight={t.negrita ? 700 : 400}>
                {t.texto}
              </text>
            ))}
          </g>
        ),
      )}
    </svg>
  );
}
