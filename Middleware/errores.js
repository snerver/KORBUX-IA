/**
 * @file Manejo de errores personalizados para la aplicación.
 * @module Errores
 */

/**
 * Clase base para errores personalizados, extendiendo Error.
 * Permite añadir propiedades adicionales como 'code', 'details', y 'timestamp'.
 */
class AppError extends Error {
  /**
   * Crea una instancia de AppError.
   * @param {string} message - Mensaje descriptivo del error.
   * @param {number} code - Código de estado HTTP asociado al error.
   * @param {Object} [details={}] - Objeto con detalles adicionales del error, como la causa original o stack trace.
   * @param {boolean} [shouldLog=false] - Indica si el error debe ser registrado en la consola.
   */
  constructor(message, code, details = {}, shouldLog = false) {
    super(message); // Llama al constructor de la clase base (Error)
    this.name = this.constructor.name; // Asigna el nombre de la clase al error (e.g., 'UnauthorizedError', 'CustomError')
    this.code = code; // Código de estado HTTP
    this.details = details; // Detalles adicionales del error
    this.timestamp = new Date().toISOString(); // Marca de tiempo del error

    // Captura el stack trace, excluyendo el propio constructor del error
    Error.captureStackTrace(this, this.constructor);

    if (shouldLog) {
      console.error(
        `[ERROR - ${this.timestamp}] ${this.name} (${this.code}): ${this.message}`,
        this.details
      );
    }
  }

  /**
   * Serializa el error a un formato JSON compatible con respuestas de API.
   * @returns {Object} Objeto de error listo para ser enviado en una respuesta HTTP.
   */
  toJSON() {
    return {
      status: "error", // O "fail" para errores de cliente (4xx) y "error" para servidor (5xx)
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Colección de errores específicos y un constructor de errores genérico.
 * Utiliza la clase AppError para crear instancias de errores tipados.
 */
class Errores {
  /**
   * 🔒 Genera un error de autenticación (401).
   * @param {string} [language='es'] - Idioma para el mensaje de error.
   * @returns {AppError} Una instancia de AppError para acceso no autorizado.
   */
  static Unauthorized(language = "es") {
    const messages = Object.freeze({
      es: "Acceso no autorizado. Se requiere autenticación válida.",
      en: "Unauthorized access. Valid authentication is required.",
    });

    const message = messages[language] || messages["es"];
    return new AppError(message, 401, {
      type: "authentication_error",
      description:
        "La solicitud no ha sido autenticada o la autenticación es inválida.",
    });
  }

  /**
   * 🚫 Genera un error de prohibición (403).
   * @param {string} [language='es'] - Idioma para el mensaje de error.
   * @returns {AppError} Una instancia de AppError para acceso prohibido.
   */
  static Forbidden(language = "es") {
    const messages = Object.freeze({
      es: "Acceso denegado. No tiene los permisos necesarios para realizar esta acción.",
      en: "Access denied. You do not have the necessary permissions to perform this action.",
    });

    const message = messages[language] || messages["es"];
    return new AppError(message, 403, {
      type: "authorization_error",
      description:
        "El usuario está autenticado pero no tiene los privilegios para acceder a este recurso.",
    });
  }

  /**
   * 🔍 Genera un error de recurso no encontrado (404).
   * @param {string} [resourceName='Recurso'] - Nombre del recurso que no se encontró.
   * @param {string} [language='es'] - Idioma para el mensaje de error.
   * @returns {AppError} Una instancia de AppError para recurso no encontrado.
   */
  static NotFound(resourceName = "Recurso", language = "es") {
    const messages = Object.freeze({
      es: `${resourceName} no encontrado.`,
      en: `${resourceName} not found.`,
    });

    const message = messages[language] || messages["es"];
    return new AppError(message, 404, {
      type: "not_found_error",
      resource: resourceName,
      description: `El ${resourceName.toLowerCase()} solicitado no existe.`,
    });
  }

  /**
   * ⚠️ Genera un error de sistema genérico o personalizado (500 por defecto).
   * Este método es versátil para errores internos, validación, etc.
   * @param {string} message - Mensaje descriptivo del error.
   * @param {number} [code=500] - Código de estado HTTP.
   * @param {Object} [details={}] - Detalles adicionales, como la causa subyacente.
   * @param {boolean} [shouldLog=false] - Si el error debe ser registrado automáticamente.
   * @returns {AppError} Una instancia de AppError personalizada.
   * @throws {Error} Si 'message' no es una cadena.
   */
  static Custom(message, code = 500, details = {}, shouldLog = false) {
    if (typeof message !== "string" || message.trim() === "") {
      throw new Error(
        "❌ 'message' debe ser una cadena no vacía para Errores.Custom."
      );
    }
    if (typeof code !== "number" || code < 100 || code >= 600) {
      console.warn(
        `⚠️ Código de error '${code}' es inusual o inválido. Usando 500.`
      );
      code = 500; // Fallback a 500 si el código es inválido
    }

    return new AppError(message, code, details, shouldLog);
  }

  /**
   * 🚨 Genera un error de servidor interno (500) para casos inesperados.
   * @param {Error} [originalError] - El error original capturado (para stack trace y mensaje).
   * @param {string} [language='es'] - Idioma para el mensaje.
   * @returns {AppError} Una instancia de AppError para error interno del servidor.
   */
  static InternalServerError(originalError, language = "es") {
    const messages = Object.freeze({
      es: "Ocurrió un error inesperado en el servidor.",
      en: "An unexpected server error occurred.",
    });

    const message = messages[language] || messages["es"];
    const details = {
      type: "internal_server_error",
      originalMessage: originalError?.message,
      stack: originalError?.stack,
      description:
        "Ha ocurrido un problema interno que impide completar la solicitud. Por favor, inténtelo de nuevo más tarde.",
    };

    // Siempre loguear errores internos del servidor
    return new AppError(message, 500, details, true);
  }
}

module.exports = Errores;
