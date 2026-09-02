const express = require('express');
const router = express.Router();
const { listar, obtener, actualizar, eliminar } = require('../controllers/usuarioController');
const { verificarToken } = require('../middlewares/auth');

router.get('/', verificarToken, listar);
router.get('/:id', verificarToken, obtener);
router.put('/:id', verificarToken, actualizar);
router.delete('/:id', verificarToken, eliminar);

module.exports = router;