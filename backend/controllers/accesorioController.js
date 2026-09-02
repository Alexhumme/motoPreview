const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res) {
  try {
    const accesorios = await prisma.accesorio.findMany({
      include: { categoria_accesorio: true },
    });
    res.json(accesorios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar accesorios' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const accesorio = await prisma.accesorio.findUnique({
      where: { id_accesorio: id },
      include: { categoria_accesorio: true },
    });
    if (!accesorio) return res.status(404).json({ error: 'Accesorio no encontrado' });
    res.json(accesorio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener accesorio' });
  }
}

async function crear(req, res) {
  try {
    const { id_categoria, acc_nombre, acc_descripcion, acc_precio, imagen, peso, codigo_sku } = req.body;
    if (!id_categoria || !acc_nombre || !acc_precio) {
      return res.status(400).json({ error: 'id_categoria, acc_nombre y acc_precio son obligatorios' });
    }
    const nuevo = await prisma.accesorio.create({
      data: {
        id_categoria,
        acc_nombre,
        acc_descripcion,
        acc_precio,
        imagen,
        peso,
        codigo_sku,
        acc_estado: 'disponible',
      },
    });
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear accesorio (revisa id_categoria o codigo_sku duplicado)' });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { id_categoria, acc_nombre, acc_descripcion, acc_precio, acc_estado, imagen, peso, codigo_sku } = req.body;
    const actualizado = await prisma.accesorio.update({
      where: { id_accesorio: id },
      data: { id_categoria, acc_nombre, acc_descripcion, acc_precio, acc_estado, imagen, peso, codigo_sku },
    });
    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar accesorio (¿existe ese id?)' });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    await prisma.accesorio.delete({ where: { id_accesorio: id } });
    res.json({ mensaje: 'Accesorio eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar accesorio (¿tiene inventario, cotizaciones o modelo 3D asociados?)' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };