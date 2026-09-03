const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Devuelve los accesorios compatibles con un modelo de moto específico
async function accesoriosPorModelo(req, res) {
  try {
    const { id_modelo_moto } = req.params;
    const compatibilidades = await prisma.accesorio_modelo_moto.findMany({
      where: { id_modelo_moto },
      include: { accesorio: { include: { categoria_accesorio: true } } },
    });
    const accesorios = compatibilidades.map((c) => c.accesorio);
    res.json(accesorios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener accesorios compatibles' });
  }
}

// Marca un accesorio como compatible con un modelo de moto
async function crear(req, res) {
  try {
    const { id_accesorio, id_modelo_moto } = req.body;
    if (!id_accesorio || !id_modelo_moto) {
      return res.status(400).json({ error: 'id_accesorio e id_modelo_moto son obligatorios' });
    }
    const nueva = await prisma.accesorio_modelo_moto.create({
      data: { id_accesorio, id_modelo_moto },
    });
    res.status(201).json(nueva);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear compatibilidad (¿ya existe esa combinación?)' });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    await prisma.accesorio_modelo_moto.delete({ where: { id_compatibilidad: id } });
    res.json({ mensaje: 'Compatibilidad eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar compatibilidad' });
  }
}

// Devuelve los modelos de moto compatibles con un accesorio específico
async function modelosPorAccesorio(req, res) {
  try {
    const { id_accesorio } = req.params;
    const compatibilidades = await prisma.accesorio_modelo_moto.findMany({
      where: { id_accesorio },
      include: { modelo_moto: { include: { marca_moto: true } } },
    });
    res.json(compatibilidades);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener modelos compatibles' });
  }
}

module.exports = { accesoriosPorModelo, modelosPorAccesorio, crear, eliminar };