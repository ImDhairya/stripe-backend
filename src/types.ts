import {RequestHandler} from "express";
import {ZodTypeAny} from "zod";
import { Transaction } from "./db";

export type Route = {
  method: "get" | "post" | "put" | "delete";
  handler: RequestHandler;
  schema?: ZodTypeAny;
  querySchema?: ZodTypeAny;
  path: string;
  middlewares?: RequestHandler[];
  isPublic?: boolean;
};



export type GlobalOptsTx = {
  tx: Transaction
}