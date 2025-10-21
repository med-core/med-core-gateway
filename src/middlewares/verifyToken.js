import jwt from "jsonwebtoken";

export function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Añadimos el usuario decodificado
    next();
  } catch (error) {
    console.error("Error al verificar token:", error);
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
}
