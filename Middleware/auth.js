require("dotenv").config();
const jwt = require("jsonwebtoken");
const debug = require("debug")("app:auth"); // Using a debug utility for better logging control

// --- Configuration and Initialization ---

//  Whitelist of API Keys from environment variables.
// Ensure filtering removes any empty strings resulting from split.
const API_KEYS = process.env.API_KEYS?.split(",").filter(Boolean) || [];

//  JWT_SECRET: ESSENTIAL for security!
// In production, NEVER use a default or easily guessable key.
// A strong, unique secret is paramount for the integrity of your tokens.
const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_DEV_JWT_SECRET = "super_insecure_dev_key_PLEASE_CHANGE"; // Only for development fallback

// --- Security Checks for JWT_SECRET ---

if (!JWT_SECRET || JWT_SECRET === DEFAULT_DEV_JWT_SECRET) {
  const errorMessage =
    process.env.NODE_ENV === "production"
      ? " CRITICAL SECURITY ERROR: JWT_SECRET is not configured or is insecure in production."
      : " Warning: JWT_SECRET is not defined. Using a default (development-only) key.";

  console.error(errorMessage);
  console.error(
    "Please define a strong, unique secret key in your environment variables (e.g., in a .env file)."
  );

  if (process.env.NODE_ENV === "production") {
    // Terminate the application if the secret key is insecure in production.
    process.exit(1);
  } else {
    // In development, we can provide a fallback, but warn clearly.
    // Assign the default only if JWT_SECRET was truly undefined.
    if (!JWT_SECRET) {
      process.env.JWT_SECRET = DEFAULT_DEV_JWT_SECRET;
      debug(
        "JWT_SECRET set to default for development: %s",
        process.env.JWT_SECRET
      );
    }
  }
} else {
  debug("JWT_SECRET is configured.");
}

/**
 * Authentication Middleware: Supports API Key or JWT.
 * - Accepts `X-API-KEY` header for API key authentication.
 * - Accepts `Authorization: Bearer <token>` header for JWT authentication.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {Function} next - Callback to proceed to the next middleware.
 */
function authenticateRequest(req, res, next) {
  try {
    const apiKey = req.header("X-API-KEY");
    const authHeader = req.header("Authorization");

    // --- API Key Verification ---
    if (apiKey) {
      if (API_KEYS.includes(apiKey)) {
        req.auth = { method: "apiKey", apiKey };
        debug("Authentication successful via API Key.");
        return next();
      } else {
        debug("API Key provided but is invalid: %s", apiKey);
        return res.status(401).json({
          status: "error",
          code: 401,
          message: "API Key inválida.",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // --- JWT Verification ---
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      if (!token) {
        debug("JWT authentication failed: Token not provided.");
        return res.status(401).json({
          status: "error",
          code: 401,
          message: "Token de autenticación no proporcionado.",
          timestamp: new Date().toISOString(),
        });
      }

      // Ensure JWT_SECRET is available at this point.
      // This check is mostly for clarity, as the initial setup should prevent this in production.
      if (!process.env.JWT_SECRET) {
        console.error(
          " Internal Error: JWT_SECRET is not configured for JWT verification."
        );
        return res.status(500).json({
          status: "error",
          code: 500,
          message:
            "Error de configuración del servidor: clave secreta JWT no disponible.",
          timestamp: new Date().toISOString(),
        });
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.auth = { method: "jwt", user: decoded };
        debug("Authentication successful via JWT for user: %o", decoded);
        return next();
      } catch (error) {
        let errorMessage = "Token inválido.";
        let statusCode = 401; // Default to Unauthorized

        if (error.name === "TokenExpiredError") {
          errorMessage = "Token expirado. Por favor, vuelva a autenticarse.";
        } else if (error.name === "JsonWebTokenError") {
          errorMessage = "Token JWT mal formado o inválido.";
        }
        // Could add specific handling for 'NotBeforeError' if `nbf` claim is used

        debug(
          "JWT authentication failed: %s (%s)",
          errorMessage,
          error.message
        );
        return res.status(statusCode).json({
          status: "error",
          code: statusCode,
          message: errorMessage,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // --- No Valid Authentication Method Provided ---
    debug("Access denied: No valid API Key or JWT token provided.");
    return res.status(403).json({
      status: "error",
      code: 403,
      message:
        "Acceso denegado. Proporcione una API Key válida o un token JWT en el encabezado 'Authorization'.",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Catch any unexpected errors within the middleware itself.
    console.error(" Unexpected error in authentication middleware:", error);
    debug("Unexpected authentication error: %s", error.message);
    return res.status(500).json({
      status: "error",
      code: 500,
      message: "Error interno del servidor durante la autenticación.",
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = authenticateRequest;
