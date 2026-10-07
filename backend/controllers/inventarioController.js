const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { verificarLimiteProductos } = require('./tiendaController'); 

async function listar(req, res) {
  try {
    const inventario = await prisma.inventario.findMany({
      where: { id_tienda: req.usuario.id_tienda },
      include: { accesorio: true, tienda: true },
    });
    res.json(inventario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar inventario' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const item = await prisma.inventario.findUnique({
      where: { id_inventario: id },
      include: { accesorio: true, tienda: true },
    });
    if (!item) return res.status(404).json({ error: 'Registro de inventario no encontrado' });
    if (item.id_tienda !== req.usuario.id_tienda) {
      return res.status(403).json({ error: 'No tienes acceso a este registro' });
    }
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
}

async function crear(req, res) {
  try {
    const { id_accesorio, stock_actual, stock_minimo } = req.body;
    const id_tienda = req.usuario.id_tienda; // nunca confiar en id_tienda del body

    if (!id_accesorio) {
      return res.status(400).json({ error: 'id_accesorio es obligatorio' });
    }

    const limite = await verificarLimiteProductos(id_tienda);
    if (!limite.permitido) {
      return res.status(403).json({ error: limite.motivo });
    }

    const estado = calcularEstado(stock_actual || 0, stock_minimo || 0);
    const nuevo = await prisma.inventario.create({
      data: {
        id_tienda,
        id_accesorio,
        stock_actual: stock_actual || 0,
        stock_minimo: stock_minimo || 0,
        estado_inventario: estado,
      },
    });
    res.status(201).json(nuevo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear inventario' });
  }
}
// El endpoint clave: registrar un movimiento y actualizar el stock automáticamente
async function registrarMovimiento(req, res) {
  try {
    const { id_inventario, id_tipomov, mov_cantidad, observaciones } = req.body;
    const id_usuario = req.usuario.id_usuario; // viene del token, no del body

    if (!id_inventario || !id_tipomov || mov_cantidad === undefined) {
      return res.status(400).json({ error: 'id_inventario, id_tipomov y mov_cantidad son obligatorios' });
    }

    const inventarioActual = await prisma.inventario.findUnique({ where: { id_inventario } });
    if (!inventarioActual) {
      return res.status(404).json({ error: 'Registro de inventario no encontrado' });
    }

    if (inventarioActual.id_tienda !== req.usuario.id_tienda) {
       return res.status(403).json({ error: 'No tienes acceso a este registro de inventario' });
    }

    const tipoMov = await prisma.tipo_movimiento.findUnique({ where: { id_tipomov } });
    if (!tipoMov) {
      return res.status(404).json({ error: 'Tipo de movimiento no encontrado' });
    }

    // Entrada suma, Salida y Ajuste negativo restan (mov_cantidad puede venir negativo desde el cliente para ajustes/salidas)
    let cantidadFinal = mov_cantidad;
    if (tipoMov.tipomov_nombre.toLowerCase() === 'salida' && mov_cantidad > 0) {
      cantidadFinal = -mov_cantidad; // por seguridad, si mandan positivo en una salida, la volvemos negativa
    }

    const nuevoStock = inventarioActual.stock_actual + cantidadFinal;
    if (nuevoStock < 0) {
      return res.status(400).json({ error: 'El movimiento dejaría el stock en negativo' });
    }

    const nuevoEstado = calcularEstado(nuevoStock, inventarioActual.stock_minimo);

    // Transacción: si algo falla, se revierte todo
    const resultado = await prisma.$transaction(async (tx) => {
      const movimiento = await tx.movimiento_inventario.create({
        data: {
          id_inventario,
          id_tipomov,
          id_usuario,
          mov_cantidad: cantidadFinal,
          observaciones,
        },
      });

      const inventarioActualizado = await tx.inventario.update({
        where: { id_inventario },
        data: {
          stock_actual: nuevoStock,
          estado_inventario: nuevoEstado,
          fecha_actualizacion: new Date(),
        },
      });

      return { movimiento, inventarioActualizado };
    });

    res.status(201).json(resultado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar movimiento de inventario' });
  }
}

function calcularEstado(stockActual, stockMinimo) {
  if (stockActual <= 0) return 'agotado';
  if (stockActual <= stockMinimo) return 'bajo';
  return 'normal';
}

module.exports = { listar, obtener, crear, registrarMovimiento };