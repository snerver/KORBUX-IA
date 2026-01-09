/**
 * @file Manejo y seguimiento de métricas de la aplicación.
 * @module Metrics
 * @author Your Name/Team Name
 */

const debug = require("debug")("app:metrics"); // For better logging control

// --- Global Metric Storage ---
/**
 * Almacenamiento de métricas en memoria.
 * En un entorno de producción a gran escala, estas métricas deberían ir a un sistema de monitoreo dedicado (Prometheus, DataDog, etc.).
 * @private
 */
const metricsStore = {
  totalRequests: 0,
  successfulResponses: 0,
  failedResponses: 0,
  // Custom counters for specific events (e.g., 'interaccion_exitosa', 'interaccion_fallida')
  customCounters: new Map(),
  requestLog: [],
};

const MAX_LOG_ENTRIES = 1000; // Maximum number of request entries to keep in memory.

// --- Middleware for Request Metrics ---
/**
 * 📌 Middleware para registrar métricas de cada petición HTTP.
 * Captura el tiempo de respuesta, el estado y los detalles de la solicitud.
 * @param {import('express').Request} req - Objeto de solicitud de Express.
 * @param {import('express').Response} res - Objeto de respuesta de Express.
 * @param {Function} next - Función para pasar al siguiente middleware.
 */
function metricsMiddleware(req, res, next) {
  metricsStore.totalRequests++;

  const startTime = process.hrtime.bigint(); // Use bigint for higher precision and direct nanoseconds

  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const durationNs = endTime - startTime;
    const durationMs = Number(durationNs / 1_000_000n).toFixed(2); // Convert nanoseconds to milliseconds

    // Classify responses based on status code
    if (res.statusCode >= 200 && res.statusCode < 400) {
      metricsStore.successfulResponses++;
    } else {
      metricsStore.failedResponses++;
    }

    // Log the request details
    const logEntry = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: parseFloat(durationMs),
      timestamp: new Date().toISOString(),
      // Add more useful details if needed, e.g., user agent, IP, request size
      // ip: req.ip,
      // userAgent: req.get('User-Agent'),
    };
    metricsStore.requestLog.push(logEntry);
    debug("Request logged: %o", logEntry);

    // Limit the size of the request history to prevent memory leaks
    if (metricsStore.requestLog.length > MAX_LOG_ENTRIES) {
      metricsStore.requestLog.shift(); // Remove the oldest entry
    }
  });

  next();
}

// --- Custom Counter Functionality ---
/**
 * ➕ Incrementa un contador personalizado.
 * Útil para métricas de negocio o eventos específicos de la aplicación.
 * @param {string} eventName - Nombre del evento a contar (ej. "login_exitoso", "interaccion_fallida").
 */
function count(eventName) {
  if (typeof eventName !== "string" || eventName.trim() === "") {
    console.warn("⚠️ Event name para contador es inválido.");
    return;
  }
  const currentCount = metricsStore.customCounters.get(eventName) || 0;
  metricsStore.customCounters.set(eventName, currentCount + 1);
  debug(
    "Counter incremented for: %s, new count: %d",
    eventName,
    currentCount + 1
  );
}

// --- Metric Retrieval Functions ---
/**
 * 📈 Devuelve métricas acumuladas del sistema.
 * Incluye métricas de Express y del sistema operativo.
 * @returns {Object} Objeto con las métricas actuales.
 */
function getMetrics() {
  const memoryUsage = process.memoryUsage();
  const customCounters = {};
  // Convert Map to a plain object for JSON serialization
  metricsStore.customCounters.forEach((value, key) => {
    customCounters[key] = value;
  });

  return {
    totalRequests: metricsStore.totalRequests,
    successfulResponses: metricsStore.successfulResponses,
    failedResponses: metricsStore.failedResponses,
    uptimeSeconds: Math.floor(process.uptime()), // Uptime of the Node.js process
    memoryUsageMB: {
      rss: parseFloat((memoryUsage.rss / 1024 / 1024).toFixed(2)), // Resident Set Size
      heapTotal: parseFloat((memoryUsage.heapTotal / 1024 / 1024).toFixed(2)), // Total V8 heap allocated
      heapUsed: parseFloat((memoryUsage.heapUsed / 1024 / 1024).toFixed(2)), // Actual V8 heap used
      external: parseFloat((memoryUsage.external / 1024 / 1024).toFixed(2)), // Memory used by C++ objects bound to JS objects
    },
    customCounters: customCounters, // Include custom event counters
    timestamp: new Date().toISOString(),
  };
}

/**
 * 📜 Devuelve las últimas N peticiones registradas.
 * Los registros están ordenados del más reciente al más antiguo.
 * @param {number} [limit=10] - El número máximo de peticiones a devolver. Debe ser un entero positivo.
 * @returns {Array<Object>} Un array de objetos, cada uno representando una petición.
 */
function getLastRequests(limit = 10) {
  // Ensure limit is a positive integer, defaulting to 10 if invalid
  const effectiveLimit = Math.max(1, parseInt(limit, 10) || 10);

  if (!metricsStore.requestLog.length) {
    debug("No hay registros de peticiones disponibles.");
    return [];
  }

  // Slice from the end to get the most recent entries and reverse to show most recent first
  return metricsStore.requestLog.slice(-effectiveLimit).reverse();
}

// --- Module Exports ---
module.exports = {
  metricsMiddleware,
  getMetrics,
  getLastRequests,
  count, // Export the new custom counter function
};
