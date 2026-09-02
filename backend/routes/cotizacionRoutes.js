const express = require('express');
const router = express.Router();
const { listar, obtener, crear, cambiarEstado } = require('../controllers/cotizacionController');
const { verificarToken } = require('../middlewares/auth');

router.get('/', verificarToken, listar);
router.get('/:id', verificarToken, obtener);
router.post('/', verificarToken, crear);
router.put('/:id/estado', verificarToken, cambiarEstado);

module.exports = router;