import redis from "./redis";
import { v4 as uuidv4 } from "uuid";
import { generateRefreshToken, verifyRefreshTokenJWT } from "./jwt";

// Ttl for Redis is in seconds, e.g., 30 days
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export const issueRefreshToken = async (userId: string): Promise<string> => {
  const jti = uuidv4();
  const token = await generateRefreshToken(userId, jti);
  // Store jti in Redis to allow revocation
  await redis.set(`refresh_token:${userId}:${jti}`, "valid", "EX", REFRESH_TOKEN_TTL_SECONDS);
  return token;
};

export const revokeRefreshToken = async (userId: string, jti: string): Promise<void> => {
  await redis.del(`refresh_token:${userId}:${jti}`);
};

export const isRefreshTokenValid = async (userId: string, jti: string): Promise<boolean> => {
  const val = await redis.get(`refresh_token:${userId}:${jti}`);
  return val === "valid";
};

export const rotateRefreshToken = async (
  token: string
): Promise<{ newRefreshToken: string; userId: string }> => {
  const payload = await verifyRefreshTokenJWT(token);
  const { id: userId, jti } = payload;
  
  const isValid = await isRefreshTokenValid(userId, jti);
  if (!isValid) {
    throw new Error("Refresh token revoked or invalid");
  }

  // Revoke old token
  await revokeRefreshToken(userId, jti);
  
  // Issue new token
  const newRefreshToken = await issueRefreshToken(userId);
  return { newRefreshToken, userId };
};
