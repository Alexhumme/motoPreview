const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res) {
  try {
    const marcas = await prisma.marca_moto.findMany();
    res.json(marcas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar marcas' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const marca = await prisma.marca_moto.findUnique({ where: { id_marca: id } });
    if (!marca) return res.status(404).json({ error: 'Marca no encontrada' });
    res.json(marca);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener marca' });
  }
}

async function crear(req, res) {
  try {
    const { marca_nombre, marca_pais } = req.body;
    if (!marca_nombre) return res.status(400).json({ error: 'marca_nombre es obligatorio' });
    const nueva = await prisma.marca_moto.create({ data: { marca_nombre, marca_pais } });
    res.status(201).json(nueva);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear marca' });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { marca_nombre, marca_pais } = req.body;
    const actualizada = await prisma.marca_moto.update({
      where: { id_marca: id },
      data: { marca_nombre, marca_pais },
    });
    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar marca (¿existe ese id?)' });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    await prisma.marca_moto.delete({ where: { id_marca: id } });
    res.json({ mensaje: 'Marca eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar marca (¿existe ese id, o tiene modelos asociados?)' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };