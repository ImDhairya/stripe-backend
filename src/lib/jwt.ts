import argon from "argon2";
import env from "./env";
import {email} from "zod";
import {User} from "../db/models";

export const generateVerificationToken = async (
  email: string,
): Promise<string> => {
  const secret = env.VERIFICATION_TOKEN_SECRET;
  const expiresIn = env.VERIFICATION_TOKEN_EXPIRATION;

  const jose = await import("jose");

  const {SignJWT} = jose;
  const encoder = new TextEncoder();

  const secretkey = encoder.encode(secret);

  const jwt = await new SignJWT({email})
    .setProtectedHeader({alg: "HS256"})
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretkey);

  return jwt;
};

export const verifyVerificationToken = async (
  token: string,
): Promise<string> => {
  const secret = env.VERIFICATION_TOKEN_SECRET;
  const jose = await import("jose");
  const {jwtVerify} = jose;
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const {payload} = await jwtVerify(token, secretKey);
  if (typeof payload !== "object" || !("email" in payload)) {
    throw new Error("Invalid verification token");
  }
  if (typeof payload.email !== "string") {
    throw new Error("Invalid email in verification token");
  }
  return payload.email;
};

type GenerateInviteTokenParams = {
  userId?: string;
  email: string;
  inviterId: string;
  shouldAutoAssign: boolean;
};

export const verifyInviteToken = async (
  token: string,
): Promise<GenerateInviteTokenParams> => {
  const secret = env.VERIFICATION_TOKEN_SECRET;

  const jose = await import("jose");
  const {jwtVerify} = jose;
  const encode = new TextEncoder();
  const secretKey = encode.encode(secret);
  const {payload} = await jwtVerify(token, secretKey);

  if (
    typeof payload !== "object" ||
    !("email" in payload) ||
    typeof payload.email !== "string" ||
    !("organizationId" in payload) ||
    typeof payload.organizationId !== "string" ||
    !("inviterId" in payload) ||
    typeof payload.inviterId !== "string" ||
    !("shouldAutoAssign" in payload) ||
    typeof payload.shouldAutoAssign !== "boolean"
  ) {
    throw new Error("Invalid invite token");
  }

  const object = {
    userId: payload.userId as string | undefined,
    email: payload.email,
    inviterId: payload.inviterId,
    shouldAutoAssign: payload.shouldAutoAssign,
  };

  return object;
};

export const generateAccessToken = async (user: Omit<User, "password">) => {
  const secret = env.ACCESS_TOKEN_SECRET;
  const expiresIn = env.ACCESS_TOKEN_EXPIRATION;

  const jose = await import("jose");
  const {SignJWT} = jose;
  const encode = new TextEncoder();
  const secretKey = encode.encode(secret);
  const jwt = await new SignJWT({
    id: user.id,
    email: user.email,
  })
    .setProtectedHeader({alg: "HS256"})
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
  return jwt;
};
