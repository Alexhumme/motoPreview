const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middlewares/auth');
const { limitarLogin, limitarGeneral } = require('../middlewares/rateLimiter');
const { register, login, solicitarRecuperacion, restablecerPassword, verificarCorreo } = require('../controllers/authController');

router.post('/register', limitarGeneral, register);
router.post('/login', limitarLogin, login);
router.get('/verificar/:token', verificarCorreo);
router.post('/forgot-password', limitarGeneral, solicitarRecuperacion);
router.post('/reset-password', limitarGeneral, restablecerPassword);

// Ruta protegida de prueba
router.get('/perfil', verificarToken, (req, res) => {
  res.json({ mensaje: 'Acceso concedido', datos_del_token: req.usuario });
});

module.exports = router;