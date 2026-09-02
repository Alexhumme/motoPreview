const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { verificarToken } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);

// Ruta protegida de prueba
router.get('/perfil', verificarToken, (req, res) => {
  res.json({ mensaje: 'Acceso concedido', datos_del_token: req.usuario });
});

module.exports = router;