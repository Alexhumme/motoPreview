const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarLimiteUsuarios } = require('./tiendaController');
const ROL_ADMIN = '11111111-0000-0000-0000-000000000001';
const ROL_VENDEDOR = '11111111-0000-0000-0000-000000000002';
const crypto = require('crypto');
const { enviarCorreoRecuperacion } = require('../services/email');
const { enviarCorreoVerificacion } = require('../services/email');
const ROL_CLIENTE = '11111111-0000-0000-0000-000000000003';

async function register(req, res) {
  try {
    const { usu_nombre, usu_email, password, id_rol, id_tienda } = req.body;

    if (!usu_nombre || !usu_email || !password || !id_rol) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: usu_nombre, usu_email, password, id_rol' });
    }

    const existente = await prisma.usuario.findUnique({ where: { usu_email } });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    // Solo los clientes autoregistrados necesitan verificar su correo;
    // los empleados que da de alta un Admin quedan verificados de una vez.
    const esCliente = id_rol === ROL_CLIENTE;
    const verificacion_token = esCliente ? crypto.randomBytes(32).toString('hex') : null;

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        usu_nombre,
        usu_email,
        password_hash,
        id_rol,
        id_tienda: id_tienda || null,
        estado_usuario: 'activo',
        email_verificado: !esCliente,
        verificacion_token,
      },
    });

    if (esCliente) {
      enviarCorreoVerificacion(usu_email, usu_nombre, verificacion_token)
        .catch((err) => console.error('Error enviando correo de verificación:', err));
    }

    const { password_hash: _, verificacion_token: __, ...usuarioSinPassword } = nuevoUsuario;

    res.status(201).json({ mensaje: 'Usuario creado con éxito', usuario: usuarioSinPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}
const jwt = require('jsonwebtoken');

async function login(req, res) {
  try {
    const { usu_email, password } = req.body;

    if (!usu_email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { usu_email } });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (usuario.estado_usuario !== 'activo') {
      return res.status(403).json({ error: 'Usuario inactivo o bloqueado' });
    }

    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, id_rol: usuario.id_rol, id_tienda: usuario.id_tienda },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { password_hash: _, ...usuarioSinPassword } = usuario;

    res.json({ mensaje: 'Login exitoso', token, usuario: usuarioSinPassword });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

async function solicitarRecuperacion(req, res) {
  try {
    const { usu_email } = req.body;
    if (!usu_email) {
      return res.status(400).json({ error: 'El correo es obligatorio' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { usu_email } });

    // Por seguridad, siempre respondemos igual exista o no el correo (no revelamos qué correos están registrados)
    if (!usuario) {
      return res.json({ mensaje: 'Si el correo existe, enviamos un enlace de recuperación' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data: { reset_token: token, reset_token_expira: expira },
    });

    await enviarCorreoRecuperacion(usuario.usu_email, usuario.usu_nombre, token);

    res.json({ mensaje: 'Si el correo existe, enviamos un enlace de recuperación' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
}

async function restablecerPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios' });
    }

    const usuario = await prisma.usuario.findFirst({ where: { reset_token: token } });

    if (!usuario || !usuario.reset_token_expira || usuario.reset_token_expira < new Date()) {
      return res.status(400).json({ error: 'El enlace es inválido o ya expiró' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data: { password_hash, reset_token: null, reset_token_expira: null },
    });

    res.json({ mensaje: 'Contraseña actualizada con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
}

async function verificarCorreo(req, res) {
  try {
    const { token } = req.params;
    const usuario = await prisma.usuario.findFirst({ where: { verificacion_token: token } });

    if (!usuario) {
      return res.status(400).json({ error: 'Enlace de verificación inválido' });
    }

    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data: { email_verificado: true, verificacion_token: null },
    });

    res.json({ mensaje: 'Correo verificado con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al verificar el correo' });
  }
}

module.exports = { register, login, solicitarRecuperacion, restablecerPassword, verificarCorreo };