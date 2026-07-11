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
    this.app.use(accessLog);
    this.app.use(
      express.json({
        verify: (req, _res, buf) => {
          if (req.url?.includes("/stripe/data")) {
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
          if (origin === env.FRONTEND_URL) return callback(null, true);
          return callback(new Error("Unknown origin url found"));
        },
      }),
    );

    // this.app.use(bullMqDashboard);
  }
  private initializePlugins() {
    // i will install all the plugins that are there
    // i need to initialize the plugins here so that i can install them all in the db
  }

  private initializeRoutes() {
    const routes: Route[] = [...userRoutes];
    const supportedMethods = ["get", "post", "put", "delete", "patch"] as const;
    routes.forEach((route) => {
      const {path: _path, method, handler, schema} = route;
      const middlewares = [...(route.middlewares || [])];
      const path = `/api${_path}`;

      if (!route.isPublic) middlewares.push(authenticate);
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
