import express from "express";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyToken } from "./middlewares/verifyToken.js";
import { requireRole } from "./middlewares/requireRole.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------
// PROXIES A SERVICIOS
// -------------------

// Auth → Público (login, registro, etc.)
app.use("/api/auth", createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,

  pathRewrite: (path, req) => {
    if (path === '/health') {
      return '/health';
    }
    return `/api/v1/auth${path}`;
  }
}));

// Users → Solo ADMINISTRADOR
app.use("/api/users",
  verifyToken,
  requireRole("ADMINISTRADOR"),
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return `/api/v1/user${path}`;
    }
  })
);

// Patients → ADMINISTRADOR o MEDICO
app.use("/api/patients",
  verifyToken,
  requireRole("ADMINISTRADOR", "MEDICO"),
  createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return `/api/v1/patient${path}`;
    }
  })
);

// Diagnostics → PACIENTE, MEDICO o ADMINISTRADOR
app.use("/api/diagnostics",
  verifyToken,
  requireRole("PACIENTE", "MEDICO", "ADMINISTRADOR"),
  createProxyMiddleware({
    target: process.env.DIAGNOSTIC_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return `/api/v1/diagnostic${path}`;
    }
  })
);

// -------------------
app.get("/", (req, res) => {
  res.json({ message: "Gateway activo y redirigiendo microservicios" });
});

// -------------------
app.listen(PORT, () => {
  console.log(`Gateway corriendo en el puerto ${PORT}`);
});
