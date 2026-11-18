// Copia el WASM de zxing a public/ para el escáner con cámara (sin depender de un CDN).
import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
mkdirSync("public/zxing", { recursive: true });
cpSync(require.resolve("zxing-wasm/reader/zxing_reader.wasm"), "public/zxing/zxing_reader.wasm");
