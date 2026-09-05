const rateLimit = require('express-rate-limit');

// Máximo 5 intentos de login por IP cada 15 minutos
const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Más permisivo para registro/recuperación, pero igual con límite razonable
const limitarGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { limitarLogin, limitarGeneral };