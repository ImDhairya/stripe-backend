import {RequestHandler} from "express";

export const requestContext: RequestHandler = (req, res, next) => {};

export const accessLog: RequestHandler = (req, res, next) => {
  const start = process.hrtime.bigint();

  // res.on("finish", () => {
  //   const ms = Math.round(Number(process.hrtime.bigint() - start) / 1e6);
  //   console.log(`
  //       Reaquest took ${ms} to complete,
  //       method: "${req.method}",
  //       path: "${req.path}"
  //       status : "${req.statusCode}"
  //     `);
  // });
  next();
};
