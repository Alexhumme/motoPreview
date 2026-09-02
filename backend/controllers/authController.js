const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function register(req, res) {
  try {
    const { usu_nombre, usu_email, password, id_rol, id_tienda } = req.body;

    // Validación básica
    if (!usu_nombre || !usu_email || !password || !id_rol) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: usu_nombre, usu_email, password, id_rol' });
    }

    // Verificar que el email no exista ya
    const existente = await prisma.usuario.findUnique({ where: { usu_email } });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }

    // Generar el hash real de la contraseña
    const password_hash = await bcrypt.hash(password, 10);

    // Crear el usuario
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        usu_nombre,
        usu_email,
        password_hash,
        id_rol,
        id_tienda: id_tienda || null,
        estado_usuario: 'activo',
      },
    });

    // Nunca devuelvas el password_hash en la respuesta
    const { password_hash: _, ...usuarioSinPassword } = nuevoUsuario;

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

module.exports = { register, login };