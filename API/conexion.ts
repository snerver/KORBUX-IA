import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolución segura del directorio actual (compatible CJS y ESM)
let currentDir: string;
if (typeof __dirname !== "undefined") {
  // Entorno CommonJS
  currentDir = __dirname;
} else {
  // Entorno ES Modules: se calcula desde import.meta.url
  const __filename = fileURLToPath(import.meta.url);
  currentDir = path.dirname(__filename);
}

// Archivo donde se guardan los datos localmente (mismo directorio que este módulo)
const dbFile = path.join(currentDir, "korbux.json");

// Interfaces
export interface User {
    id: number;
    name: string;
    email: string;
}

export interface KorbuxDB {
    users: User[];
}

// ----------------------------------------
// Funciones 100% offline sin servidor
// ----------------------------------------

export function readDB(): KorbuxDB {
    if (!fs.existsSync(dbFile)) {
        return { users: [] };
    }

    const raw = fs.readFileSync(dbFile, "utf8").trim();
    if (!raw) return { users: [] };

    return JSON.parse(raw);
}

export function writeDB(db: KorbuxDB): void {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf8");
}

// ----------------------------------------
// Funciones CRUD para usar dentro del proyecto
// ----------------------------------------

export function getUsers(): User[] {
    const db = readDB();
    return db.users;
}

export function createUser(name: string, email: string): User {
    const db = readDB();

    const newUser: User = {
        id: db.users.length + 1,
        name,
        email
    };

    db.users.push(newUser);
    writeDB(db);

    return newUser;
}

export function getUserById(id: number): User | null {
    const db = readDB();
    return db.users.find(u => u.id === id) || null;
}

// ----------------------------------------
// Crear archivo si no existe
// ----------------------------------------

if (!fs.existsSync(dbFile)) {
    console.log("Creando korbux.json vacío...");
    writeDB({ users: [] });
}