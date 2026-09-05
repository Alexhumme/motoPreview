const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarLimiteUsuarios } = require('./tiendaController');
const ROL_ADMIN = '11111111-0000-0000-0000-000000000001';
const ROL_VENDEDOR = '11111111-0000-0000-0000-000000000002';

async function listar(req, res) {
  try {
    // Ignora cualquier id_tienda que venga en la URL — siempre usa el del token
    const usuarios = await prisma.usuario.findMany({
      where: { id_tienda: req.usuario.id_tienda },
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
    const { usu_nombre, id_rol, estado_usuario, password } = req.body;

    const objetivo = await prisma.usuario.findUnique({ where: { id_usuario: id } });
    if (!objetivo || objetivo.id_tienda !== req.usuario.id_tienda) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (estado_usuario && estado_usuario !== 'bloqueado') {
      const esEmpleado = objetivo.id_rol === ROL_ADMIN || objetivo.id_rol === ROL_VENDEDOR;
      const estabaBloqueado = objetivo.estado_usuario === 'bloqueado';
      if (esEmpleado && estabaBloqueado) {
        const limite = await verificarLimiteUsuarios(objetivo.id_tienda);
        if (!limite.permitido) {
          return res.status(403).json({ error: limite.motivo });
        }
      }
    }

    const data = { usu_nombre, id_rol, estado_usuario };
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
    const objetivo = await prisma.usuario.findUnique({ where: { id_usuario: id } });
    if (!objetivo || objetivo.id_tienda !== req.usuario.id_tienda) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
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