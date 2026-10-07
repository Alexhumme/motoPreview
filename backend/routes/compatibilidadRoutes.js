const express = require('express');
const router = express.Router();
const { accesoriosPorModelo, modelosPorAccesorio, crear, eliminar } = require('../controllers/compatibilidadController');
const { verificarToken } = require('../middlewares/auth');

router.get('/modelo/:id_modelo_moto', accesoriosPorModelo);
router.get('/accesorio/:id_accesorio', modelosPorAccesorio);
router.post('/', verificarToken, crear);
router.delete('/:id', verificarToken, eliminar);

module.exports = router;