const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res) {
  try {
    // Filtra opcionalmente por tienda: /api/usuarios?id_tienda=xxx
    const { id_tienda } = req.query;
    const usuarios = await prisma.usuario.findMany({
      where: id_tienda ? { id_tienda } : undefined,
      include: { rol: true, tienda: true },
    });
    const sinPassword = usuarios.map(({ password_hash, ...u }) => u);
    res.json(sinPassword);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: id },
      include: { rol: true, tienda: true },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { password_hash, ...sinPassword } = usuario;
    res.json(sinPassword);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { usu_nombre, id_rol, id_tienda, estado_usuario, password } = req.body;

    const data = { usu_nombre, id_rol, id_tienda, estado_usuario };
    if (password) {
      data.password_hash = await bcrypt.hash(password, 10);
    }

    const actualizado = await prisma.usuario.update({
      where: { id_usuario: id },
      data,
    });
    const { password_hash, ...sinPassword } = actualizado;
    res.json(sinPassword);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar usuario (¿existe ese id?)' });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    // Mejor "desactivar" que borrar de verdad, para no perder el historial de cotizaciones/movimientos
    const desactivado = await prisma.usuario.update({
      where: { id_usuario: id },
      data: { estado_usuario: 'bloqueado' },
    });
    res.json({ mensaje: 'Usuario desactivado', usuario: { id_usuario: desactivado.id_usuario } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al desactivar usuario (¿existe ese id?)' });
  }
}

module.exports = { listar, obtener, actualizar, eliminar };