import {PgTable} from "drizzle-orm/pg-core";
import * as models from "../db/models/index";

const UnauthenticatedErrorTypes = [
  "auth:invalid_token",
  "auth:invalid_verification_token",
  "auth:invalid_credentials",
  "auth:invalid_forgot_password_token",
  "user:invalid_password",
] as const;
export type UnauthenticatedErrorType =
  (typeof UnauthenticatedErrorTypes)[number];

export class UnauthenticatedError extends Error {
  status = 401;
  type: UnauthenticatedErrorType;
  constructor(
    type: UnauthenticatedErrorType,
    message = "User is not authenticated",
  ) {
    super(message);
    this.name = "UnauthenticatedError";
    this.type = type;
  }
}

const ConflictErrorTypes = ["auth:email_already_exists"] as const;

export type ConflictErrorType = (typeof ConflictErrorTypes)[number];

class ConflictError extends Error {
  type: string;
  status = 409;
  constructor(type: ConflictErrorType, message = "Conflict Error") {
    super(message);
    this.name = "Conflict Error";
    this.type = type;
  }
}

const NotFoundErrorTypes = [
  "resource:not_found",
] as const;
type NotFoundErrorType = (typeof NotFoundErrorTypes)[number];
type ModelKeys = {
  [K in keyof typeof models]: (typeof models)[K] extends PgTable<any>
    ? K
    : never;
}[keyof typeof models];

export class NotFoundError extends Error {
  type: NotFoundErrorType;
  status = 404;
  resource: ModelKeys;
  constructor(
    type: NotFoundErrorType,
    resource: ModelKeys,
    message = "Resource not found",
  ) {
    super(message);
    this.name = "NotFoundError";
    this.type = type;
    this.resource = resource;
  }
}

const BadRequestErrorTypes = [
  "validation:bad_path_params",
  "validation:bad_params",
  "sql:unknown_column",
  "sql:invalid_query",
  "validation:invalid_postal_id",
  "file:invalid",
] as const;
type BadRequestErrorType = (typeof BadRequestErrorTypes)[number];
export class BadRequestError extends Error {
  type: BadRequestErrorType;
  status = 400;
  constructor(type: BadRequestErrorType, message = "Bad request") {
    super(message);
    this.name = "BadRequestError";
    this.type = type;
  }
}

export const errors = {
  UnauthenticatedError,
  NotFoundError,
  BadRequestError,
  ConflictError,
};
