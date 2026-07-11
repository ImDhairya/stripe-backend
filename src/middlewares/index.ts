import {asyncHandler} from "../lib/async-handler";
import z, {ZodError} from "zod";

import {ErrorRequestHandler, RequestHandler} from "express";

export const validateBody: (schema: z.ZodTypeAny) => RequestHandler = (
  schema: z.ZodTypeAny,
) => {
  return asyncHandler((req, res, next) => {
    const result = schema.parse(req.body);
    req.body = result;
    next();
  });
};

export const validateQuery: (schema: z.ZodTypeAny) => RequestHandler = (
  schema: z.ZodTypeAny,
) => {
  return asyncHandler(async (req, res, next) => {
    schema.parse(req.query);
    next();
  });
};

// if an error arises how will it be handled here is the way
// lets say an error occured it will have to pop out in the bubble form like its in a layered onion
// that error will be returned by teh controller by the routes and finally to here it will come
// what will come in is this is where an error is captured any error of Unauthenticated
// an error of whatever type is there it will be coming in through and centrally handled

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      issue: err.issues,
    });
  }

  const message = err.message || "Something went wrong";

  return res.status(err.status || 500).json({
    error: {
      message,
      status: err.status || 500,
      resource: err.resource,
    },
  });
};

export const routeNotFoundHandler: RequestHandler = (req, res, next) => {
  res.status(404).json({
    error: {
      message: "Route not found",
      status: 404,
    },
  });
};
