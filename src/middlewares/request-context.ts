import {RequestHandler} from "express";
import {logger} from "../lib/logger";
import {httpRequestDurationMicroseconds, errorRates} from "../lib/metrics";
import pinoHttp from "pino-http";
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export const requestContext: RequestHandler = (req, res, next) => {};

// Add structured logging
export const httpLogger = pinoHttp({
  logger,
  customProps: (req, res) => {
    return {
      requestId: (req as any).id,
    };
  }
});

export const accessLog = (req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);
  (req as any).id = requestId;
  
  const end = httpRequestDurationMicroseconds.startTimer();
  
  res.on("finish", () => {
    end({ method: req.method, route: req.route?.path || req.path, code: res.statusCode });
    if (res.statusCode >= 500) {
      errorRates.inc({ type: "http", component: req.route?.path || req.path });
    }
  });

  httpLogger(req, res);
  next();
};
