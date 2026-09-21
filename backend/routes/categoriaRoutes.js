const express = require('express');
const router = express.Router();
const { listar, obtener, crear, actualizar, eliminar } = require('../controllers/categoriaController');
const { verificarToken } = require('../middlewares/auth');

router.get('/', listar);
router.get('/:id', obtener);
router.post('/', verificarToken, crear);
router.put('/:id', verificarToken, actualizar);
router.delete('/:id', verificarToken, eliminar);

module.exports = router;