import {RequestHandler} from "express";
import {db} from "../db";
import {idempotencyKeys} from "../db/models";
import crypto from "crypto";
import {eq} from "drizzle-orm";

export const idempotency: RequestHandler = async (req, res, next) => {
  const key = req.headers["idempotency-key"] as string;
  if (!key) {
    return res.status(400).json({
      error: { message: "Idempotency-Key header is required", status: 400 }
    });
  }

  const userId = res.locals.user.id;
  const requestBodyStr = JSON.stringify(req.body || {});
  const requestHash = crypto.createHash("sha256").update(requestBodyStr).digest("hex");

  try {
    const [existingKey] = await db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, key));

    if (existingKey) {
      if (existingKey.userId !== userId) {
        return res.status(403).json({ error: { message: "Idempotency key belongs to another user", status: 403 }});
      }
      if (existingKey.requestHash !== requestHash) {
        return res.status(409).json({ error: { message: "Idempotency key already used with different payload", status: 409 }});
      }
      if (existingKey.statusCode) {
        return res.status(existingKey.statusCode).json(JSON.parse(existingKey.responseBody || "{}"));
      } else {
        return res.status(409).json({ error: { message: "Request currently processing", status: 409 }});
      }
    }

    // Create the key
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours
    
    await db.insert(idempotencyKeys).values({
      key,
      userId,
      requestHash,
      expiresAt
    });

    // Intercept response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Save response asynchronously
      db.update(idempotencyKeys)
        .set({
          statusCode: res.statusCode,
          responseBody: JSON.stringify(body)
        })
        .where(eq(idempotencyKeys.key, key))
        .execute()
        .catch(console.error);

      return originalJson(body);
    };

    next();
  } catch (err) {
    next(err);
  }
};
