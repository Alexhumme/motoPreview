const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res) {
  try {
    const roles = await prisma.rol.findMany();
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar roles' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const rol = await prisma.rol.findUnique({ where: { id_rol: id } });
    if (!rol) return res.status(404).json({ error: 'Rol no encontrado' });
    res.json(rol);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener rol' });
  }
}

async function crear(req, res) {
  try {
    const { nombre_rol, descripcion_rol } = req.body;
    if (!nombre_rol) return res.status(400).json({ error: 'nombre_rol es obligatorio' });
    const nuevo = await prisma.rol.create({ data: { nombre_rol, descripcion_rol } });
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear rol' });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { nombre_rol, descripcion_rol } = req.body;
    const actualizado = await prisma.rol.update({
      where: { id_rol: id },
      data: { nombre_rol, descripcion_rol },
    });
    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar rol (¿existe ese id?)' });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    await prisma.rol.delete({ where: { id_rol: id } });
    res.json({ mensaje: 'Rol eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar rol (¿existe ese id, o tiene usuarios asociados?)' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };