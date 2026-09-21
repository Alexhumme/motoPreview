const express = require('express');
const router = express.Router();
const { listar, obtener, crear, cambiarEstado } = require('../controllers/cotizacionController');
const { verificarToken } = require('../middlewares/auth');
const { verificarRol } = require('../middlewares/verificarRol');

const ROL_ADMIN = '11111111-0000-0000-0000-000000000001';
const ROL_VENDEDOR = '11111111-0000-0000-0000-000000000002';

router.get('/', verificarToken, listar);
router.get('/:id', verificarToken, obtener);
router.post('/', verificarToken, crear);
router.put('/:id/estado', verificarToken, verificarRol([ROL_ADMIN, ROL_VENDEDOR]), cambiarEstado);

module.exports = router;