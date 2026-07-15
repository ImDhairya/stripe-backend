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
  refreshTokenHandler,
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
    path: "/v1/auth/signup",
    schema: signupSchema,
    isPublic: true,
    handler: signupStartHandler as RequestHandler,
  },
  {
    method: "post",
    path: "/v1/auth/signup/complete",
    isPublic: true,
    schema: signupCompleteSchema,
    handler: signupCompleteHandler as RequestHandler,
  },
  {
    method: "post",
    path: "/v1/auth/login",
    schema: loginSchema,
    isPublic: true,
    handler: loginHandler,
  },
  {
    method: "post",
    path: "/v1/auth/forgot-password",
    schema: forgotPasswordSchema,
    isPublic: true,
    handler: forgotPasswordHandler,
  },
  {
    method: "post",
    path: "/v1/auth/reset-password",
    schema: resetPasswordSchema,
    isPublic: true,
    handler: resetPasswordHandler,
  },
  {
    method: "post",
    path: "/v1/auth/refresh",
    isPublic: true,
    handler: refreshTokenHandler,
  },

  // ── Authenticated ──────────────────────────────────────
  {
    method: "post",
    path: "/v1/auth/logout",
    handler: logoutHandler,
  },
  {
    method: "get",
    path: "/v1/auth/me",
    handler: getMeHandler,
  },
  {
    method: "put",
    path: "/v1/auth/me",
    schema: updateProfileSchema,
    handler: updateProfileHandler,
  },
  {
    method: "post",
    path: "/v1/auth/change-password",
    schema: changePasswordSchema,
    handler: changePasswordHandler,
  },
];

export default routes;
