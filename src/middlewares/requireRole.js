/**
 * Middleware de control de roles (RBAC) con opción a permitir acceso al propietario del recurso.
 *
 * Uso:
 * 1. Solo roles: requireRole("ADMINISTRADOR", "MEDICO")
 * 2. Roles + Propietario (para rutas /:id): requireRole(true, "ADMINISTRADOR")
 */
export function requireRole(allowOwnerOrRole, ...allowedRoles) {
  // Determinar si el primer argumento es un booleano para 'allowOwner'
  // o si es un rol.
  const allowOwner = typeof allowOwnerOrRole === 'boolean' ? allowOwnerOrRole : false;
  
  // Reconstruir la lista de roles si el primer argumento fue 'allowOwner'
  const roles = allowOwner 
    ? allowedRoles 
    : [allowOwnerOrRole, ...allowedRoles]; 

  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "No autenticado." });
      }

      const userRole = req.user.role;
      const userIdFromToken = req.user.id;
      
      // 1. Verificar si el rol está permitido
      if (roles.includes(userRole)) {
        return next();
      }

      // 2. Si no es un rol permitido, verificar si se permite al propietario
      if (allowOwner) {
        // Asumimos que el ID del recurso siempre está en req.params.id o req.params.patientId
        const resourceId = req.params.id || req.params.patientId;
        
        // El usuario puede acceder si es el PROPIETARIO
        if (userIdFromToken === resourceId) {
          return next();
        }
      }

      // Si ninguna de las condiciones se cumplió
      return res.status(403).json({
        message: "No tienes permiso para acceder a este recurso.",
        role: userRole,
        allowed: roles,
        // Agregamos contexto para depuración:
        ownerCheck: allowOwner ? "FAILED" : "NOT_APPLICABLE"
      });

    } catch (error) {
      console.error("Error en requireRole:", error);
      res.status(500).json({ message: "Error interno al validar permisos." });
    }
  };
}