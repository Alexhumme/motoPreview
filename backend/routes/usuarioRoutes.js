const express = require('express');
const router = express.Router();
const { listar, obtener, actualizar, eliminar } = require('../controllers/usuarioController');
const { verificarToken } = require('../middlewares/auth');
const { verificarRol } = require('../middlewares/verificarRol');

const ROL_ADMIN = '11111111-0000-0000-0000-000000000001';

router.get('/', verificarToken, verificarRol([ROL_ADMIN]), listar);
router.get('/:id', verificarToken, verificarRol([ROL_ADMIN]), obtener);
router.put('/:id', verificarToken, verificarRol([ROL_ADMIN]), actualizar);
router.delete('/:id', verificarToken, verificarRol([ROL_ADMIN]), eliminar);

module.exports = router;