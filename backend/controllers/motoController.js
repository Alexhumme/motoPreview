const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// include anidado: trae el modelo, y dentro del modelo, la marca
const incluirRelaciones = {
  modelo_moto: {
    include: { marca_moto: true },
  },
};

async function listar(req, res) {
  try {
    const motos = await prisma.moto.findMany({ include: incluirRelaciones });
    res.json(motos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar motos' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const moto = await prisma.moto.findUnique({
      where: { id_moto: id },
      include: incluirRelaciones,
    });
    if (!moto) return res.status(404).json({ error: 'Moto no encontrada' });
    res.json(moto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener moto' });
  }
}

async function crear(req, res) {
  try {
    const { id_modelo_moto, moto_anio, moto_version, moto_imagen } = req.body;
    if (!id_modelo_moto || !moto_anio) {
      return res.status(400).json({ error: 'id_modelo_moto y moto_anio son obligatorios' });
    }
    const nueva = await prisma.moto.create({
      data: { id_modelo_moto, moto_anio, moto_version, moto_imagen },
    });
    res.status(201).json(nueva);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear moto (¿existe ese id_modelo_moto?)' });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { id_modelo_moto, moto_anio, moto_version, moto_imagen } = req.body;
    const actualizada = await prisma.moto.update({
      where: { id_moto: id },
      data: { id_modelo_moto, moto_anio, moto_version, moto_imagen },
    });
    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar moto (¿existe ese id?)' });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    await prisma.moto.delete({ where: { id_moto: id } });
    res.json({ mensaje: 'Moto eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar moto (¿tiene cotizaciones asociadas?)' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };