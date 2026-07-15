import * as jose from "jose";
import env from "./env";
import {User} from "../db/models";

export type AccessTokenPayload = {
  id: string;
  email: string;
  role: "user" | "admin";
  tier: "free" | "paid";
};

export type RefreshTokenPayload = {
  id: string;
  jti: string;
};

export const generateAccessToken = async (user: Omit<User, "password">): Promise<string> => {
  const secretKey = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
  
  const payload: AccessTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role as "user" | "admin",
    tier: user.tier as "free" | "paid",
  };

  return new jose.SignJWT(payload)
    .setProtectedHeader({alg: "HS256"})
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_EXPIRATION)
    .sign(secretKey);
};

export const generateRefreshToken = async (userId: string, jti: string): Promise<string> => {
  const secretKey = new TextEncoder().encode(env.REFRESH_TOKEN_SECRET);
  
  const payload: RefreshTokenPayload = {
    id: userId,
    jti,
  };

  return new jose.SignJWT(payload)
    .setProtectedHeader({alg: "HS256"})
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRATION)
    .sign(secretKey);
};

export const verifyAccessToken = async (token: string): Promise<AccessTokenPayload> => {
  const secretKey = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
  const {payload} = await jose.jwtVerify(token, secretKey);
  return payload as unknown as AccessTokenPayload;
};

export const verifyRefreshTokenJWT = async (token: string): Promise<RefreshTokenPayload> => {
  const secretKey = new TextEncoder().encode(env.REFRESH_TOKEN_SECRET);
  const {payload} = await jose.jwtVerify(token, secretKey);
  return payload as unknown as RefreshTokenPayload;
};

// Legacy Verification / Invite Token Methods

export const generateVerificationToken = async (email: string): Promise<string> => {
  const secretKey = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET); // Reusing secret for simplicity
  return new jose.SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
};

export const verifyVerificationToken = async (token: string): Promise<string> => {
  const secretKey = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
  const { payload } = await jose.jwtVerify(token, secretKey);
  return payload.email as string;
};

export const verifyInviteToken = async (token: string): Promise<any> => {
  const secretKey = new TextEncoder().encode(env.ACCESS_TOKEN_SECRET);
  const { payload } = await jose.jwtVerify(token, secretKey);
  return {
    userId: payload.userId,
    email: payload.email,
    inviterId: payload.inviterId,
    shouldAutoAssign: payload.shouldAutoAssign,
  };
};
