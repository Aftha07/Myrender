import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
const isProduction = process.env.NODE_ENV === "production";

// CORS configuration for production
if (isProduction) {
  app.use(cors({
    origin: process.env.RAILWAY_PUBLIC_DOMAIN ? 
      [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`] : 
      true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }));
} else {
  app.use(cors({ origin: true, credentials: true }));
}

// Security headers for production
if (isProduction) {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

// Trust proxy for Railway
app.set('trust proxy', 1);

// Middleware to handle large JSON and form bodies
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Logging middleware (reduce verbosity in production)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let responseBody: any;

  const originalJson = res.json;
  res.json = function (body, ...args) {
    responseBody = body;
    return originalJson.apply(this, [body, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // In production, only log errors and important info
      if (!isProduction || res.statusCode >= 400) {
        if (responseBody && !isProduction) {
          try {
            logLine += ` :: ${JSON.stringify(responseBody)}`;
          } catch {
            // safely ignore errors in JSON.stringify
          }
        }

        if (logLine.length > 120) {
          logLine = logLine.slice(0, 119) + "…";
        }

        log(logLine);
      }
    }
  });

  next();
});

// Async bootstrap
(async () => {
  const server = await registerRoutes(app);

  // Health check endpoint for Railway
  app.get('/health', (_req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV 
    });
  });

  // Enhanced error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    const message = isProduction ? "Internal Server Error" : (err.message || "Internal Server Error");

    res.status(status).json({ message });
    
    // Log full error details in development, minimal in production
    if (isProduction) {
      console.error(`Error ${status}:`, message);
    } else {
      console.error("Unhandled error:", err);
    }
  });

  // Vite setup for development, static serving for production
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  const HOST = process.env.RAILWAY_PUBLIC_DOMAIN ? "0.0.0.0" : "0.0.0.0";

  server.listen(
    { port: +PORT, host: HOST, reusePort: true },
    () => {
      const environment = process.env.NODE_ENV || 'development';
      log(`🚀 Server running on http://${HOST}:${PORT} (${environment})`);
      
      if (isProduction) {
        log(`📦 Serving static files from dist/public`);
        log(`🔒 Security headers enabled`);
        log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
      }
    }
  );
})();
