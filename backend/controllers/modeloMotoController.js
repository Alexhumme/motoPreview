const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res) {
  try {
    const modelos = await prisma.modelo_moto.findMany({
      include: { marca_moto: true }, // trae los datos de la marca junto con el modelo
    });
    res.json(modelos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar modelos de moto' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const modelo = await prisma.modelo_moto.findUnique({
      where: { id_modelo_moto: id },
      include: { marca_moto: true },
    });
    if (!modelo) return res.status(404).json({ error: 'Modelo no encontrado' });
    res.json(modelo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener modelo de moto' });
  }
}

async function crear(req, res) {
  try {
    const { id_marca, modelo_nombre, modelo_descripcion, cilindraje } = req.body;
    if (!id_marca || !modelo_nombre) {
      return res.status(400).json({ error: 'id_marca y modelo_nombre son obligatorios' });
    }
    const nuevo = await prisma.modelo_moto.create({
      data: { id_marca, modelo_nombre, modelo_descripcion, cilindraje },
    });
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear modelo de moto (¿existe esa id_marca?)' });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { id_marca, modelo_nombre, modelo_descripcion, cilindraje } = req.body;
    const actualizado = await prisma.modelo_moto.update({
      where: { id_modelo_moto: id },
      data: { id_marca, modelo_nombre, modelo_descripcion, cilindraje },
    });
    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar modelo (¿existe ese id?)' });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    await prisma.modelo_moto.delete({ where: { id_modelo_moto: id } });
    res.json({ mensaje: 'Modelo eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar modelo (¿tiene motos asociadas?)' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };