const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ROL_ADMIN = '11111111-0000-0000-0000-000000000001';
const ROL_VENDEDOR = '11111111-0000-0000-0000-000000000002';

async function listar(req, res) {
  try {
    const tiendas = await prisma.tienda.findMany({
      include: { plan_subscripcion: true },
    });
    res.json(tiendas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al listar tiendas' });
  }
}

async function obtener(req, res) {
  try {
    const { id } = req.params;
    const tienda = await prisma.tienda.findUnique({
      where: { id_tienda: id },
      include: { plan_subscripcion: true },
    });
    if (!tienda) return res.status(404).json({ error: 'Tienda no encontrada' });
    res.json(tienda);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener tienda' });
  }
}

async function crear(req, res) {
  try {
    const { id_plan, nombre_tienda, nit, direccion_tienda, telefono_tienda, email_tienda } = req.body;
    if (!id_plan || !nombre_tienda) {
      return res.status(400).json({ error: 'id_plan y nombre_tienda son obligatorios' });
    }
    const nueva = await prisma.tienda.create({
      data: {
        id_plan,
        nombre_tienda,
        nit,
        direccion_tienda,
        telefono_tienda,
        email_tienda,
        estado_tienda: 'activa',
      },
    });
    res.status(201).json(nueva);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear tienda (¿existe ese id_plan, o el NIT ya está registrado?)' });
  }
}

async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { id_plan, nombre_tienda, nit, direccion_tienda, telefono_tienda, email_tienda, estado_tienda } = req.body;
    const actualizada = await prisma.tienda.update({
      where: { id_tienda: id },
      data: { id_plan, nombre_tienda, nit, direccion_tienda, telefono_tienda, email_tienda, estado_tienda },
    });
    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar tienda (¿existe ese id?)' });
  }
}

async function eliminar(req, res) {
  try {
    const { id } = req.params;
    await prisma.tienda.delete({ where: { id_tienda: id } });
    res.json({ mensaje: 'Tienda eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar tienda (¿tiene usuarios, inventario o cotizaciones asociados?)' });
  }
}

// Verifica si la tienda puede agregar un producto más, según el límite de su plan
async function verificarLimiteProductos(id_tienda) {
  const tienda = await prisma.tienda.findUnique({
    where: { id_tienda },
    include: { plan_subscripcion: true },
  });
  if (!tienda) return { permitido: false, motivo: 'Tienda no encontrada' };

  const totalProductos = await prisma.inventario.count({ where: { id_tienda } });
  const limite = tienda.plan_subscripcion.limite_productos;

  if (limite !== null && totalProductos >= limite) {
    return { permitido: false, motivo: `Límite de ${limite} productos alcanzado para el plan ${tienda.plan_subscripcion.plan_nombre}` };
  }
  return { permitido: true };
}

// Verifica si la tienda puede agregar un empleado más (Admin o Vendedor), según su plan.
// Los bloqueados no cuentan para el límite, y los clientes tampoco.
async function verificarLimiteUsuarios(id_tienda) {
  const tienda = await prisma.tienda.findUnique({
    where: { id_tienda },
    include: { plan_subscripcion: true },
  });

  if (!tienda) {
    return { permitido: false, motivo: 'Tienda no encontrada' };
  }

  const totalEmpleados = await prisma.usuario.count({
    where: {
      id_tienda,
      id_rol: { in: [ROL_ADMIN, ROL_VENDEDOR] },
      estado_usuario: { not: 'bloqueado' },
    },
  });

  const limite = tienda.plan_subscripcion.limite_usuarios;

  if (limite !== null && totalEmpleados >= limite) {
    return {
      permitido: false,
      motivo: `Límite de ${limite} empleados alcanzado para el plan ${tienda.plan_subscripcion.plan_nombre}`,
    };
  }

  return { permitido: true };
}

module.exports = { listar, obtener, crear, actualizar, eliminar, verificarLimiteProductos, verificarLimiteUsuarios };