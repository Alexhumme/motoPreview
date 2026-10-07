const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { enviarCorreoCambioEstado } = require('../services/email');

const ROL_ADMIN = '11111111-0000-0000-0000-000000000001';
const ROL_VENDEDOR = '11111111-0000-0000-0000-000000000002';

async function listar(req, res) {
  try {
    const esEmpleado = req.usuario.id_rol === ROL_ADMIN || req.usuario.id_rol === ROL_VENDEDOR;

    const cotizaciones = await prisma.cotizacion.findMany({
      where: esEmpleado
        ? { id_tienda: req.usuario.id_tienda }
        : { id_usuario: req.usuario.id_usuario },
      include: {
        moto: { include: { modelo_moto: { include: { marca_moto: true } } } },
        detalle_cotizacion: { include: { accesorio: true } },
        usuario: true,
      },
    });
    res.json(cotizaciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar cotizaciones' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id_cotizacion: id },
      include: {
        moto: { include: { modelo_moto: { include: { marca_moto: true } } } },
        detalle_cotizacion: { include: { accesorio: true } },
      },
    });
    if (!cotizacion) return res.status(404).json({ error: 'Cotización no encontrada' });
    res.json(cotizacion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
}

async function crear(req, res) {
  try {
    const { id_moto, coti_observaciones, items } = req.body;
    const id_usuario = req.usuario.id_usuario;
    const id_tienda = req.usuario.id_tienda;

    if (!id_moto || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'id_moto e items (lista no vacía) son obligatorios' });
    }

    const idsAccesorios = items.map((i) => i.id_accesorio);
    const accesorios = await prisma.accesorio.findMany({
      where: { id_accesorio: { in: idsAccesorios } },
    });

    if (accesorios.length !== idsAccesorios.length) {
      return res.status(400).json({ error: 'Uno o más id_accesorio no existen' });
    }

    const detalles = items.map((item) => {
      const accesorio = accesorios.find((a) => a.id_accesorio === item.id_accesorio);
      const precio_unitario = Number(accesorio.acc_precio);
      const subtotal = precio_unitario * item.cantidad;
      return {
        id_accesorio: item.id_accesorio,
        cantidad: item.cantidad,
        precio_unitario,
        subtotal,
      };
    });

    const total = detalles.reduce((suma, d) => suma + d.subtotal, 0);

    const resultado = await prisma.$transaction(async (tx) => {
      const cotizacion = await tx.cotizacion.create({
        data: {
          id_tienda,
          id_usuario,
          id_moto,
          coti_estado: 'pendiente',
          total,
          coti_observaciones,
        },
      });

      await tx.detalle_cotizacion.createMany({
        data: detalles.map((d) => ({ ...d, id_cotizacion: cotizacion.id_cotizacion })),
      });

      const cotizacionCompleta = await tx.cotizacion.findUnique({
        where: { id_cotizacion: cotizacion.id_cotizacion },
        include: { detalle_cotizacion: { include: { accesorio: true } } },
      });

      return cotizacionCompleta;
    });

    res.status(201).json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
}

async function cambiarEstado(req, res) {
  try {
    const { id } = req.params;
    const { coti_estado } = req.body;

    const estadosValidos = ['pendiente', 'aprobada', 'rechazada', 'completada'];
    if (!estadosValidos.includes(coti_estado)) {
      return res.status(400).json({ error: `coti_estado debe ser uno de: ${estadosValidos.join(', ')}` });
    }

    const cotizacionExistente = await prisma.cotizacion.findUnique({ where: { id_cotizacion: id } });
    if (!cotizacionExistente) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    if (cotizacionExistente.id_tienda !== req.usuario.id_tienda) {
      return res.status(403).json({ error: 'No tienes acceso a esta cotización' });
    }

    const actualizada = await prisma.cotizacion.update({
      where: { id_cotizacion: id },
      data: { coti_estado },
      include: { usuario: true },
    });

    enviarCorreoCambioEstado(
      actualizada.usuario.usu_email,
      actualizada.usuario.usu_nombre,
      coti_estado,
      actualizada.total
    ).catch((err) => console.error('Error enviando correo de notificación:', err));

    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar estado (¿existe ese id?)' });
  }
}

module.exports = { listar, obtener, crear, cambiarEstado };