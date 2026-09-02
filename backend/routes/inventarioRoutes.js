const express = require('express');
const router = express.Router();
const { listar, obtener, crear, registrarMovimiento } = require('../controllers/inventarioController');
const { verificarToken } = require('../middlewares/auth');

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', verificarToken, crear);
router.post('/movimiento', verificarToken, registrarMovimiento);

module.exports = router;