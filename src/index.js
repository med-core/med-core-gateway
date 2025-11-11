import express from "express";
import dotenv from "dotenv";
import cors from "cors"
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyToken } from "./middlewares/verifyToken.js";
import { requireRole } from "./middlewares/requireRole.js";

dotenv.config();

const app = express();
// Middleware CORS
app.use(
  cors({
    origin: [
      'http://localhost:5173'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
);
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
    if (path === '/health') {
      return '/health';
    }
    return `/api/v1/users${path}`;
  }
}));

// ==================== DIAGNOSTIC SERVICE ====================
app.use("/api/diagnostics", verifyToken,
  createProxyMiddleware({
    target: process.env.DIAGNOSTIC_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      if (path === '/health') return '/health';
      return `/api/v1/diagnostics${path}`;
    },
    onProxyReq: (proxyReq, req) => {
      // Pasar token y usuario autenticado
      if (req.headers.authorization) {
        proxyReq.setHeader("Authorization", req.headers.authorization);
      }
      if (req.user) {
        proxyReq.setHeader("x-user", JSON.stringify(req.user));
      }
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
    if (path === '/health') {
      return '/health';
    }
    return `/api/v1/patients${path}`;
  }
}));
app.use("/api/patients/:patientId/diagnostics",
  createProxyMiddleware({
    target: process.env.DIAGNOSTIC_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: path => path.replace("/api/patients", "/api/v1/patients"),
    onProxyReq: (proxyReq, req) => {
      console.log("GATEWAY -> Headers antes de enviar al microservicio:");
      console.log(req.headers); // Ver el Authorization y user
      if (req.headers.authorization) {
        proxyReq.setHeader("Authorization", req.headers.authorization);
      }
      if (req.user) {
        console.log("GATEWAY -> Pasando req.user al microservicio:", req.user);
        proxyReq.setHeader("x-user", JSON.stringify(req.user));
      }
    }
  })
);

// DEPARTMENTS → ADMIN
app.use("/api/departments", verifyToken, requireRole("ADMINISTRADOR"),
  createProxyMiddleware({
    target: process.env.DEPARTMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/departments': '/api/v1/departments',
    }
  })
);

// SPECIALIZATIONS → ADMIN
app.use("/api/specializations", verifyToken, requireRole("ADMINISTRADOR"),
  createProxyMiddleware({
    target: process.env.SPECIALIZATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/specializations': '/api/v1/specializations',
    }
  })
);

// DOCTORS
app.use("/api/doctors", verifyToken, requireRole("ADMINISTRADOR", "MEDICO"),
  createProxyMiddleware({
    target: process.env.DOCTOR_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      if (path === '/health') return '/health';
      return `/api/v1/doctors${path}`;
    }
  })
);

// NURSES
app.use("/api/nurses", verifyToken, requireRole("ADMINISTRADOR", "ENFERMERO"),
  createProxyMiddleware({
    target: process.env.NURSE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      if (path === '/health') return '/health';
      return `/api/v1/nurses${path}`;
    }
  })
);

// APPOINTMENTS
app.use("/api/appointments", verifyToken,
  createProxyMiddleware({
    target: process.env.APPOINTMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      if (path === '/health') return '/health';
      return `/api/v1/appointments${path}`;
    },
    onProxyReq: (proxyReq, req) => {
      if (req.user) {
        proxyReq.setHeader("x-user", JSON.stringify(req.user));
      }
    }
  })
);

// QUEUE + WEBSOCKET
app.use("/api/queue", createProxyMiddleware({
  target: process.env.QUEUE_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  pathRewrite: (path, req) => path === '/health' ? '/health' : path
}));

app.use("/socket.io", createProxyMiddleware({
  target: process.env.QUEUE_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/socket.io': '/socket.io' }
}));

// -------------------
app.get("/", (req, res) => {
  res.json({ message: "Gateway activo y redirigiendo microservicios" });
});

// -------------------
app.listen(PORT, () => {
  console.log(`Gateway corriendo en el puerto ${PORT}`);
});
