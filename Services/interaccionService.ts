import crypto from "crypto";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// ------------------------------------------------------------
// Ruta absoluta a korbux.json (compatible CommonJS y ES Modules)
// ------------------------------------------------------------
let currentDir: string;

if (typeof __dirname !== "undefined") {
  // Entorno CommonJS: __dirname ya existe como global
  currentDir = __dirname;
} else {
  // Entorno ES Modules: se calcula a partir de import.meta.url
  currentDir = path.dirname(fileURLToPath(import.meta.url));
}

// La raíz del proyecto está dos niveles por encima del directorio actual (Services/)
const FILE_PATH = path.resolve(currentDir, "..", "..", "korbux.json");

// ------------------------------------------------------------
// Control de concurrencia para escrituras seguras (evita corrupción)
// ------------------------------------------------------------
let escrituraEnCurso: Promise<void> = Promise.resolve();

function encolarEscritura(fn: () => Promise<void>): void {
  escrituraEnCurso = escrituraEnCurso.then(fn, fn); // serializa las escrituras
}

// ------------------------------------------------------------
// Tipo de interacción registrada
// ------------------------------------------------------------
export interface Interaccion {
  id: string;
  usuarioId: string;
  mensajeUsuario: string;
  conversationId: string;   // corregido el nombre (antes faltaba la 's')
  timestamp: string;
}

// ------------------------------------------------------------
// Genera un UUID único
// ------------------------------------------------------------
function generarUUID(): string {
  return crypto.randomUUID();
}

// ------------------------------------------------------------
// Lee el archivo korbux.json de forma asíncrona y segura
// ------------------------------------------------------------
async function leerArchivo(): Promise<Interaccion[]> {
  try {
    await fsPromises.access(FILE_PATH); // verifica que el archivo existe
    const data = await fsPromises.readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      throw new Error("Formato inválido: se esperaba un array");
    }
    return parsed as Interaccion[];
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return []; // el archivo no existe, lo consideramos vacío
    }
    console.error("[interaccionService] Error al leer korbux.json:", err?.message || err);
    return [];
  }
}

// ------------------------------------------------------------
// Escribe en korbux.json de forma asíncrona y serializada
// ------------------------------------------------------------
async function escribirArchivo(interacciones: Interaccion[]): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    encolarEscritura(async () => {
      try {
        const dir = path.dirname(FILE_PATH);
        await fsPromises.mkdir(dir, { recursive: true }); // crea la carpeta si no existe
        await fsPromises.writeFile(
          FILE_PATH,
          JSON.stringify(interacciones, null, 2),
          "utf-8"
        );
        resolve();
      } catch (err: any) {
        console.error("[interaccionService] Error al escribir korbux.json:", err?.message || err);
        reject(new Error("No se pudo guardar la interacción"));
      }
    });
  });
}

// ------------------------------------------------------------
// Registra una interacción en korbux.json
// ------------------------------------------------------------
export async function registrarInteraccion(
  usuarioId: string,
  mensajeUsuario: string,
  conversationId: string = "default"
): Promise<Interaccion> {
  // Validaciones obligatorias
  if (!usuarioId || !mensajeUsuario) {
    throw new Error("usuarioId y mensajeUsuario son obligatorios.");
  }

  const uId = usuarioId.trim();
  const msg = mensajeUsuario.trim();
  const convId = conversationId.trim();

  if (uId.length === 0) throw new Error("usuarioId no puede estar vacío.");
  if (msg.length === 0) throw new Error("mensajeUsuario no puede estar vacío.");
  if (convId.length === 0) throw new Error("conversationId no puede estar vacío.");

  // Desinfección adicional (límite de longitud y caracteres seguros)
  const sanitizedConvId = convId.replace(/[^\w\-.: ]/g, "").substring(0, 100);
  const sanitizedMsg = msg.substring(0, 5000); // límite máximo del mensaje

  const nuevaInteraccion: Interaccion = {
    id: generarUUID(),
    usuarioId: uId,
    mensajeUsuario: sanitizedMsg,
    conversationId: sanitizedConvId,
    timestamp: new Date().toISOString(),
  };

  const interacciones = await leerArchivo();
  interacciones.push(nuevaInteraccion);
  await escribirArchivo(interacciones);

  console.info("[interaccionService] Interacción registrada:", nuevaInteraccion.id);
  return nuevaInteraccion;
}