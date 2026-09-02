const express = require('express');
const router = express.Router();
const { listar, obtenerPorAccesorio, crear, actualizar, eliminar } = require('../controllers/modelo3dController');
const { verificarToken } = require('../middlewares/auth');

router.get('/', listar);
router.get('/accesorio/:id_accesorio', obtenerPorAccesorio);
router.post('/', verificarToken, crear);
router.put('/:id', verificarToken, actualizar);
router.delete('/:id', verificarToken, eliminar);

module.exports = router;