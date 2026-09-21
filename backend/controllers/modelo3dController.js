const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res) {
  try {
    const modelos = await prisma.modelo_3d.findMany({ include: { accesorio: true } });
    res.json(modelos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar modelos 3D' });
  }
}

async function obtenerPorAccesorio(req, res) {
  try {
    const { id_accesorio } = req.params;
    const modelo = await prisma.modelo_3d.findFirst({ where: { id_accesorio } });
    if (!modelo) return res.status(404).json({ error: 'Este accesorio no tiene modelo 3D asociado' });
    res.json(modelo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener modelo 3D' });
  }
}

async function crear(req, res) {
  try {
    const { id_accesorio, url_modelo3d, formato_archivo, modelo3d_observaciones } = req.body;
    if (!id_accesorio || !url_modelo3d) {
      return res.status(400).json({ error: 'id_accesorio y url_modelo3d son obligatorios' });
    }
    const nuevo = await prisma.modelo_3d.create({
      data: {
        id_accesorio,
        url_modelo3d,
        formato_archivo: formato_archivo || 'glb',
        estado_visualizacion: 'listo',
        modelo3d_observaciones,
      },
    });
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear modelo 3D (¿existe ese id_accesorio?)' });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { url_modelo3d, formato_archivo, estado_visualizacion, modelo3d_observaciones } = req.body;
    const actualizado = await prisma.modelo_3d.update({
      where: { id_modelo3d: id },
      data: { url_modelo3d, formato_archivo, estado_visualizacion, modelo3d_observaciones },
    });
    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar modelo 3D (¿existe ese id?)' });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    await prisma.modelo_3d.delete({ where: { id_modelo3d: id } });
    res.json({ mensaje: 'Modelo 3D eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar modelo 3D' });
  }
}

module.exports = { listar, obtenerPorAccesorio, crear, actualizar, eliminar };