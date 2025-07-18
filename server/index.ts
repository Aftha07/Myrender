import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Middleware to handle large JSON and form bodies
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Logging middleware
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

      if (responseBody) {
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
  });

  next();
});

// Async bootstrap
(async () => {
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error("Unhandled error:", err);
  });

  // Only use Vite in development mode
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  const HOST = "0.0.0.0";

  server.listen(
    { port: +PORT, host: HOST, reusePort: true },
    () => {
      log(`🚀 Server running on http://${HOST}:${PORT}`);
    }
  );
})();
