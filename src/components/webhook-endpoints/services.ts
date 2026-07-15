import {db} from "../../db";
import {webhookEndpoints} from "../../db/models";
import {CreateWebhookEndpointSchema, UpdateWebhookEndpointSchema} from "./schema";
import crypto from "crypto";
import {eq, and} from "drizzle-orm";
import {NotFoundError} from "../../lib/errors";

export const createWebhookEndpoint = async (userId: string, data: CreateWebhookEndpointSchema) => {
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
  
  const [endpoint] = await db.insert(webhookEndpoints).values({
    userId,
    url: data.url,
    description: data.description,
    secret,
  }).returning();

  return endpoint;
};

export const listWebhookEndpoints = async (userId: string) => {
  return await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.userId, userId));
};

export const updateWebhookEndpoint = async (userId: string, endpointId: string, data: UpdateWebhookEndpointSchema) => {
  const [endpoint] = await db.select().from(webhookEndpoints).where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.userId, userId)));
  if (!endpoint) throw new NotFoundError("resource:not_found", "webhook_endpoints" as any, "Webhook endpoint not found");

  const [updated] = await db.update(webhookEndpoints)
    .set(data)
    .where(eq(webhookEndpoints.id, endpointId))
    .returning();
    
  return updated;
};

export const deleteWebhookEndpoint = async (userId: string, endpointId: string) => {
  const [deleted] = await db.delete(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.userId, userId)))
    .returning();
    
  if (!deleted) throw new NotFoundError("resource:not_found", "webhook_endpoints" as any, "Webhook endpoint not found");
  
  return { success: true };
};
