import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./lib/env";
import {accessLog} from "./middlewares/request-context";
import {authenticate} from "./middlewares/authenticate";
import {Route} from "./types";
import userRoutes from "./components/users/routes";
import {
  errorHandler,
  routeNotFoundHandler,
  validateBody,
  validateQuery,
} from "./middlewares";
import adminRoutes from "./components/admin/routes";
import paymentRoutes from "./components/payments/routes";
import refundRoutes from "./components/refunds/routes";
import searchRoutes from "./components/search/routes";
import stripeWebhookRoutes from "./components/stripe-webhooks/routes";
import webhookEndpointRoutes from "./components/webhook-endpoints/routes";
import testingRoutes from "./components/testing/routes";
import systemRoutes from "./components/system/routes";

import {metricsEndpoint} from "./lib/metrics";

class App {
  private app: express.Application;
  constructor() {
    this.app = express();
    this.app.enable("trust proxy");
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.app.use(routeNotFoundHandler);
    this.app.use(errorHandler);
  }

  // initialize middlewares will be used to make the app setup correctly for the cors and related proxy middelware setups
  private initializeMiddlewares() {
    this.app.get("/", (_req, res) => {
      res.status(200).json({
        service: "PayGate Transaction Engine & Gateway",
        status: "healthy",
        version: "1.0.0",
        endpoints: {
          health: "/health",
          metrics: "/metrics",
          api: "/api/v1",
        },
      });
    });
    this.app.get("/health", (_req, res) => {
      res.status(200).json({ status: "ok" });
    });
    this.app.get("/metrics", metricsEndpoint);
    this.app.use(accessLog);
    this.app.use(
      express.json({
        verify: (req, _res, buf) => {
          if (req.url?.includes("/stripe/data") || req.url?.includes("/sandbox-receiver")) {
            (req as any).rawBody = buf;
          }
        },
      }),
    );
    this.app.use(express.urlencoded({extended: true}));
    this.app.use(cookieParser());
    this.app.use(
      cors({
        credentials: true,
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (
            origin === env.FRONTEND_URL ||
            env.CORS_ORIGINS.includes(origin) ||
            origin.startsWith("http://localhost:") ||
            origin.startsWith("http://127.0.0.1:")
          ) {
            return callback(null, true);
          }
          return callback(new Error("Unknown origin url found"));
        },
        exposedHeaders: [
          "X-RateLimit-Limit",
          "X-RateLimit-Remaining",
          "X-RateLimit-Reset",
          "X-Request-Id",
          "Retry-After",
        ],
        allowedHeaders: [
          "Content-Type",
          "Authorization",
          "X-Refresh-Token",
          "X-Request-Id",
          "X-Idempotency-Key",
          "Idempotency-Key",
        ],
      }),
    );

    // this.app.use(bullMqDashboard);
  }
  private initializePlugins() {
    // i will install all the plugins that are there
    // i need to initialize the plugins here so that i can install them all in the db
  }

  private initializeRoutes() {
    const routes: Route[] = [
      ...userRoutes,
      ...adminRoutes,
      ...paymentRoutes,
      ...refundRoutes,
      ...searchRoutes,
      ...stripeWebhookRoutes,
      ...webhookEndpointRoutes,
      ...testingRoutes,
      ...systemRoutes,
    ];
    const supportedMethods = ["get", "post", "put", "delete", "patch"] as const;
    routes.forEach((route) => {
      const {path: _path, method, handler, schema} = route;
      const middlewares = [...(route.middlewares || [])];
      const path = `/api${_path}`;

      if (!route.isPublic) middlewares.unshift(authenticate);
      if (schema) middlewares.push(validateBody(schema));
      if (route.querySchema) middlewares.push(validateQuery(route.querySchema));

      if (!supportedMethods.includes(method as any)) {
        throw new Error(`Unsupported method ${method} for route ${path}`);
      }

      this.app[method as "get" | "post" | "put" | "delete"](
        path,
        ...middlewares,
        handler,
      );
    });
  }

  listen() {
    this.app.listen(env.PORT);
    console.log("The app is listening on port", env.PORT);
  }
}

export default App;
