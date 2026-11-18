/** Íconos del diseño (trazos de 24 × 24). */
const RUTAS = {
  escanear: ["M4 7V5a1 1 0 0 1 1-1h2", "M17 4h2a1 1 0 0 1 1 1v2", "M20 17v2a1 1 0 0 1-1 1h-2", "M7 20H5a1 1 0 0 1-1-1v-2", "M8 8v8", "M11 8v8", "M13.5 8v8", "M16 8v8"],
  descargar: ["M12 4v11", "M7 10l5 5 5-5", "M5 20h14"],
  subir: ["M12 20V9", "M7 14l5-5 5 5", "M5 4h14"],
  palomita: ["M5 12.5l4.5 4.5L19 7"],
  cerrar: ["M6 6l12 12", "M18 6L6 18"],
  alerta: ["M12 9v4", "M12 16.5v.5", "M10.3 3.9L2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
  impresora: ["M7 9V4h10v5", "M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2", "M7 14h10v6H7z"],
  buscar: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "M20 20l-4-4"],
  camara: ["M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z", "M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"],
} as const;

export type NombreIcono = keyof typeof RUTAS;

export default function Icono({ nombre, tam = 24, trazo = 2.2, className }: { nombre: NombreIcono; tam?: number; trazo?: number; className?: string }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={trazo}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`block flex-none ${className ?? ""}`}
      aria-hidden="true"
    >
      {RUTAS[nombre].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
