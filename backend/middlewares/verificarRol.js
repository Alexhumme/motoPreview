// Recibe una lista de roles permitidos y bloquea si el usuario del token no está en esa lista
function verificarRol(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.id_rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };
}

module.exports = { verificarRol };