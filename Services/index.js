// services/index.js

/**
 * @file Archivo de índice para la carpeta de servicios.
 * @description Centraliza la exportación de todos los servicios de la aplicación,
 * permitiendo una importación más limpia y organizada en otros módulos.
 * Carga dinámicamente todos los servicios definidos en esta carpeta.
 * @module services/index
 */

const path = require("path");
const fs = require("fs");

// Logger con fallback por si la ruta no existe (evita que el índice muera)
let logger;
try {
  logger = require(path.join(__dirname, "..", "config", "logger.js"));
} catch {
  // Si no hay logger, usamos console para no detener la carga
  logger = {
    info: console.log,
    warn: console.warn,
    error: console.error
  };
}

/**
 * Objeto que contendrá todas las instancias de los servicios cargados.
 * @type {Object.<string, any>}
 */
const services = {};

/**
 * Ruta absoluta a la carpeta de servicios.
 * @type {string}
 */
const servicesPath = __dirname;

logger.info(" [Services Index] Iniciando carga dinámica de servicios...");

try {
  // Leer todos los elementos en la carpeta de servicios.
  const entries = fs.readdirSync(servicesPath);

  for (const entry of entries) {
    // Ignorar el propio index.js y cualquier elemento que no sea archivo .js
    if (entry === "index.js" || !entry.endsWith(".js")) {
      continue;
    }

    const serviceFilePath = path.join(servicesPath, entry);

    // Verificar que realmente sea un archivo (no un subdirectorio)
    try {
      if (!fs.lstatSync(serviceFilePath).isFile()) {
        continue;
      }
    } catch (statError) {
      // Si no podemos leer sus metadatos, lo ignoramos
      continue;
    }

    // Obtener el nombre del servicio (ej. 'chatService' de 'chatService.js')
    const serviceName = path.basename(entry, ".js");

    // Convertir a camelCase para la propiedad (primera letra minúscula)
    const camelCaseServiceName =
      serviceName.charAt(0).toLowerCase() + serviceName.slice(1);

    try {
      // Cargar el servicio
      services[camelCaseServiceName] = require(serviceFilePath);
      logger.info(
        ` [Services Index] Servicio '${serviceName}' cargado exitosamente.`
      );
    } catch (err) {
      const mensaje = err?.message || err;
      logger.error(
        ` [Services Index] Error al cargar el servicio '${serviceName}' desde '${serviceFilePath}': ${mensaje}`
      );
      // Asignar null a la misma clave camelCase para mantener la interfaz
      services[camelCaseServiceName] = null;
    }
  }
} catch (err) {
  const mensaje = err?.message || err;
  logger.error(
    " [Services Index] Error crítico al leer la carpeta de servicios:",
    mensaje
  );
}

logger.info(" [Services Index] Carga de servicios completada.");

/**
 * Exporta un objeto que contiene todas las instancias de los servicios cargados.
 * Esto permite importar múltiples servicios de forma desestructurada en otros módulos:
 * `const { chatService, authService, userService } = require('../services');`
 *
 * @property {AnalyticsService|null} analyticsService - Instancia del servicio de analíticas.
 * @property {AuditService|null} auditService - Instancia del servicio de auditoría.
 * @property {AuthService|null} authService - Instancia del servicio de autenticación.
 * @property {CacheService|null} cacheService - Instancia del servicio de caché.
 * @property {ChatService|null} chatService - Instancia del servicio de chat.
 * @property {EmailService|null} emailService - Instancia del servicio de correo electrónico.
 * @property {EncryptionService|null} encryptionService - Instancia del servicio de encriptación.
 * // Añade aquí las propiedades para cualquier otro servicio que crees (ej. userService, storageService).
 */
module.exports = services;