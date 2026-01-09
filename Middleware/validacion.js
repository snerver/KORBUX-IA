/**
 * @file Define las rutas de la API para la interacción del chat.
 * @module routes/interaccion
 * @author Your Name/Team Name
 */

const express = require("express");
const router = express.Router();

// 🔹 Controlador principal para manejar la lógica del chat
const chatController = require("../controllers/chatController"); // Asegúrate de que esta ruta sea correcta

// 🔹 Middlewares
const {
  validarInteraccion,
} = require("../middleware/validacion/validadorInteraccion"); // Ruta corregida
const { apiLimiter } = require("../config/security"); // Asegúrate de que esta ruta sea correcta
const Errores = require("../utils/errores"); // Importa la clase Errores mejorada

// ------------------------------------------
// 📌 RUTA POST: Usuario envía un mensaje al sistema
// ------------------------------------------
/**
 * @swagger
 * /api/interactuar:
 *   post:
 *     summary: Envía un mensaje de usuario al sistema de chat.
 *     description: Procesa la interacción del usuario y devuelve la respuesta del sistema.
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuarioId
 *               - mensajeUsuario
 *             properties:
 *               usuarioId:
 *                 type: string
 *                 description: ID único del usuario.
 *                 example: "user123"
 *               mensajeUsuario:
 *                 type: string
 *                 description: El mensaje enviado por el usuario.
 *                 example: "¿Cuál es el pronóstico del tiempo para mañana?"
 *     responses:
 *       200:
 *         description: Interacción procesada exitosamente, devuelve la respuesta del sistema.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   description: Objeto de respuesta del controlador de chat.
 *                   example: { respuestaAsistente: "El pronóstico es soleado.", interaccionId: 1678886400000 }
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-07-05T18:30:00.000Z"
 *       400:
 *         description: Solicitud inválida (ej. falta usuarioId o mensajeUsuario).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Demasiadas peticiones (Rate Limit).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor al procesar la interacción.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/interactuar",
  apiLimiter, // Limita el número de peticiones por IP
  validarInteraccion, // Asegura que el mensaje tenga estructura válida
  async (req, res, next) => {
    try {
      const respuesta = await chatController.manejarInteraccion(req.body);
      return res.status(200).json({
        status: "success",
        data: respuesta,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(Errores.InternalServerError(err));
    }
  }
);

// ------------------------------------------
// 📌 RUTA GET: Obtener historial de chat del usuario
// ------------------------------------------
/**
 * @swagger
 * /api/interactuar/historial/{usuarioId}:
 *   get:
 *     summary: Obtiene el historial de interacciones de un usuario.
 *     description: Recupera todos los mensajes previos y respuestas del sistema para un usuario específico.
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID único del usuario cuyo historial se desea obtener.
 *         example: "user123"
 *     responses:
 *       200:
 *         description: Historial de chat recuperado exitosamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 usuarioId:
 *                   type: string
 *                   example: "user123"
 *                 historial:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id_interaccion:
 *                         type: number
 *                         example: 1678886400000
 *                       mensaje_usuario:
 *                         type: string
 *                         example: "¿Hola?"
 *                       mensaje_asistente:
 *                         type: string
 *                         example: "Hola, ¿en qué puedo ayudarte?"
 *                       fecha:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-07-05T18:30:00.000Z"
 *       400:
 *         description: Solicitud inválida (ej. usuarioId no proporcionado o inválido).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Demasiadas peticiones (Rate Limit).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor al obtener el historial.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  "/interactuar/historial/:usuarioId",
  apiLimiter,
  async (req, res, next) => {
    try {
      const { usuarioId } = req.params;

      if (
        !usuarioId ||
        typeof usuarioId !== "string" ||
        usuarioId.trim() === ""
      ) {
        return next(
          Errores.Custom(
            "El parámetro 'usuarioId' es obligatorio y debe ser una cadena válida no vacía.",
            400,
            { parameter: "usuarioId" }
          )
        );
      }

      const historial = await chatController.obtenerHistorial(usuarioId.trim());
      return res.status(200).json({
        status: "success",
        usuarioId: usuarioId.trim(),
        historial,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      next(Errores.InternalServerError(err));
    }
  }
);

// 🚀 Exportación del router para uso en la app principal
module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           description: Estado de la respuesta, siempre "error".
 *           example: "error"
 *         code:
 *           type: number
 *           description: Código de estado HTTP del error.
 *           example: 400
 *         message:
 *           type: string
 *           description: Mensaje descriptivo del error.
 *           example: "El usuarioId y mensajeUsuario son obligatorios."
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Marca de tiempo ISO 8601 de cuando ocurrió el error.
 *           example: "2025-07-05T18:30:00.000Z"
 *         details:
 *           type: object
 *           description: Objeto opcional con detalles adicionales del error.
 *           example: { parameter: "usuarioId" }
 */

/**
 * @file Middleware para validar la estructura de la interacción del chat.
 * @module middleware/validacion/validadorInteraccion
 */

function validarInteraccion(req, res, next) {
  const { usuarioId, mensajeUsuario } = req.body;

  // Validar usuarioId
  if (!usuarioId || typeof usuarioId !== "string" || usuarioId.trim() === "") {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "El campo 'usuarioId' es obligatorio y debe ser una cadena válida no vacía.",
      details: { parameter: "usuarioId" },
      timestamp: new Date().toISOString(),
    });
  }

  // Validar mensajeUsuario
  if (!mensajeUsuario || typeof mensajeUsuario !== "string" || mensajeUsuario.trim() === "") {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "El campo 'mensajeUsuario' es obligatorio y debe ser una cadena válida no vacía.",
      details: { parameter: "mensajeUsuario" },
      timestamp: new Date().toISOString(),
    });
  }

  // Si pasa las validaciones, continuar
  next();
}

module.exports = { validarInteraccion };
