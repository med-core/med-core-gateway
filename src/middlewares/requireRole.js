/**
 * Middleware de control de roles (RBAC)
 * router.get("/ruta", verifyToken, requireRole("ADMINISTRADOR", "MEDICO"), controlador);
 */

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    try {
      // Si el middleware de autenticación no agregó el usuario:
      if (!req.user) {
        return res.status(401).json({ message: "No autenticado." });
      }

      const userRole = req.user.role;

      // Si el rol del usuario no está permitido para esta ruta:
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          message: "No tienes permiso para acceder a este recurso.",
          role: userRole,
          allowed: allowedRoles
        });
      }

      // Todo correcto -> continuar
      next();

    } catch (error) {
      console.error("Error en requireRole:", error);
      res.status(500).json({ message: "Error interno al validar permisos." });
    }
  };
}
