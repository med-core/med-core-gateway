import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Token requerido" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token requerido" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error("Error al verificar token en gateway:", error.message);
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};
