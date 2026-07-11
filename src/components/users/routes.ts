import {RequestHandler} from "express";
import {Route} from "../../types";
import {
  signupStartHandler,
  signupCompleteHandler,
  loginHandler,
  logoutHandler,
  getMeHandler,
  updateProfileHandler,
  changePasswordHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "./controller";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupCompleteSchema,
  signupSchema,
  updateProfileSchema,
} from "./schema";

const routes: Route[] = [
  // ── Auth (public) ──────────────────────────────────────
  {
    method: "post",
    path: "/v1/users/signup",
    schema: signupSchema,
    isPublic: true,
    handler: signupStartHandler as RequestHandler,
  },
  {
    method: "post",
    path: "/v1/users/signup/complete",
    isPublic: true,
    schema: signupCompleteSchema,
    handler: signupCompleteHandler as RequestHandler,
  },
  {
    method: "post",
    path: "/v1/users/login",
    schema: loginSchema,
    isPublic: true,
    handler: loginHandler,
  },
  {
    method: "post",
    path: "/v1/users/forgot-password",
    schema: forgotPasswordSchema,
    isPublic: true,
    handler: forgotPasswordHandler,
  },
  {
    method: "post",
    path: "/v1/users/reset-password",
    schema: resetPasswordSchema,
    isPublic: true,
    handler: resetPasswordHandler,
  },

  // ── Authenticated ──────────────────────────────────────
  {
    method: "post",
    path: "/v1/users/logout",
    handler: logoutHandler,
  },
  {
    method: "get",
    path: "/v1/users/me",
    handler: getMeHandler,
  },
  {
    method: "put",
    path: "/v1/users/me",
    schema: updateProfileSchema,
    handler: updateProfileHandler,
  },
  {
    method: "post",
    path: "/v1/users/change-password",
    schema: changePasswordSchema,
    handler: changePasswordHandler,
  },
];

export default routes;
