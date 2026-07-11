import {NextFunction, Request, RequestHandler, Response} from "express";

type AsyncHandler = <TSchema = unknown, TParams = unknown>(
  fn: (
    req: Request<TParams, any, TSchema>,
    res: Response,
    next: NextFunction,
  ) => any,
) => RequestHandler<TParams, any, TSchema>;

export const asyncHandler: AsyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};