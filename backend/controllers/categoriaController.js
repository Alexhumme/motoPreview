const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Listar todas las categorías
async function listar(req, res) {
  try {
    const categorias = await prisma.categoria_accesorio.findMany();
    res.json(categorias);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar categorías' });
  }
}

// Obtener una categoría por id
async function obtener(req, res) {
  try {
    const { id } = req.params;
    const categoria = await prisma.categoria_accesorio.findUnique({
      where: { id_categoria: id },
    });
    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(categoria);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener categoría' });
  }
}

// Crear una categoría nueva
async function crear(req, res) {
  try {
    const { cat_nombre, cat_descripcion } = req.body;
    if (!cat_nombre) {
      return res.status(400).json({ error: 'cat_nombre es obligatorio' });
    }
    const nueva = await prisma.categoria_accesorio.create({
      data: { cat_nombre, cat_descripcion },
    });
    res.status(201).json(nueva);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
}

// Actualizar una categoría
async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { cat_nombre, cat_descripcion } = req.body;
    const actualizada = await prisma.categoria_accesorio.update({
      where: { id_categoria: id },
      data: { cat_nombre, cat_descripcion },
    });
    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar categoría (¿existe ese id?)' });
  }
}

// Eliminar una categoría
async function eliminar(req, res) {
  try {
    const { id } = req.params;
    await prisma.categoria_accesorio.delete({
      where: { id_categoria: id },
    });
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar categoría (¿existe ese id, o tiene accesorios asociados?)' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };