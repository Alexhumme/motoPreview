const express = require('express');
const router = express.Router();
const { listar, obtener, crear, registrarMovimiento } = require('../controllers/inventarioController');
const { verificarToken } = require('../middlewares/auth');
const { verificarRol } = require('../middlewares/verificarRol');

const ROL_ADMIN = '11111111-0000-0000-0000-000000000001';
const ROL_VENDEDOR = '11111111-0000-0000-0000-000000000002';

router.get('/', verificarToken, verificarRol([ROL_ADMIN, ROL_VENDEDOR]), listar);
router.get('/:id', verificarToken, verificarRol([ROL_ADMIN, ROL_VENDEDOR]), obtener);
router.post('/', verificarToken, verificarRol([ROL_ADMIN, ROL_VENDEDOR]), crear);
router.post('/movimiento', verificarToken, verificarRol([ROL_ADMIN, ROL_VENDEDOR]), registrarMovimiento);

module.exports = router;