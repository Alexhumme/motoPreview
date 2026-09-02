const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listar(req, res) {
  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      include: {
        moto: { include: { modelo_moto: { include: { marca_moto: true } } } },
        detalle_cotizacion: { include: { accesorio: true } },
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

// Crear cotización con su detalle, calculando subtotales y total automáticamente
async function crear(req, res) {
  try {
    const { id_tienda, id_moto, coti_observaciones, items } = req.body;
    const id_usuario = req.usuario.id_usuario; // del token

    // items esperado: [{ id_accesorio, cantidad }, ...]
    if (!id_tienda || !id_moto || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'id_tienda, id_moto e items (lista no vacía) son obligatorios' });
    }

    // Trae los precios reales de los accesorios (nunca confíes en un precio que venga del cliente)
    const idsAccesorios = items.map((i) => i.id_accesorio);
    const accesorios = await prisma.accesorio.findMany({
      where: { id_accesorio: { in: idsAccesorios } },
    });

    if (accesorios.length !== idsAccesorios.length) {
      return res.status(400).json({ error: 'Uno o más id_accesorio no existen' });
    }

    // Arma el detalle con precios reales y calcula subtotales
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

    // Transacción: cabecera + detalles juntos
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

// Cambiar el estado de una cotización (aprobar/rechazar/completar)
async function cambiarEstado(req, res) {
  try {
    const { id } = req.params;
    const { coti_estado } = req.body;

    const estadosValidos = ['pendiente', 'aprobada', 'rechazada', 'completada'];
    if (!estadosValidos.includes(coti_estado)) {
      return res.status(400).json({ error: `coti_estado debe ser uno de: ${estadosValidos.join(', ')}` });
    }

    const actualizada = await prisma.cotizacion.update({
      where: { id_cotizacion: id },
      data: { coti_estado },
    });

    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar estado (¿existe ese id?)' });
  }
}

module.exports = { listar, obtener, crear, cambiarEstado };