import {db} from "../../db";
import {webhookEndpoints, webhookEvents} from "../../db/models";
import {CreateWebhookEndpointSchema, UpdateWebhookEndpointSchema} from "./schema";
import crypto from "crypto";
import {v4 as uuidv4} from "uuid";
import {eq, and, desc} from "drizzle-orm";
import {NotFoundError} from "../../lib/errors";
import {logAudit} from "../../lib/audit";
import {outboundQueue} from "../../lib/bullmq";

export const createWebhookEndpoint = async (userId: string, data: CreateWebhookEndpointSchema) => {
  const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
  
  const [endpoint] = await db.insert(webhookEndpoints).values({
    userId,
    url: data.url,
    description: data.description,
    secret,
  }).returning();

  if (!endpoint) {
    throw new Error("Failed to insert webhook endpoint");
  }

  // Audit log
  await logAudit(db, {
    userId,
    action: "webhook_endpoint.created",
    resourceType: "webhook_endpoint",
    resourceId: endpoint.id,
    metadata: {
      url: endpoint.url,
      description: endpoint.description,
    },
  });

  return endpoint;
};

export const listWebhookEndpoints = async (userId: string) => {
  return await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.userId, userId));
};

export const updateWebhookEndpoint = async (userId: string, endpointId: string, data: UpdateWebhookEndpointSchema) => {
  const [endpoint] = await db.select().from(webhookEndpoints).where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.userId, userId)));
  if (!endpoint) throw new NotFoundError("resource:not_found", "webhook_endpoints" as any, "Webhook endpoint not found");

  if (Object.keys(data).length === 0) {
    return endpoint;
  }

  const [updated] = await db.update(webhookEndpoints)
    .set(data)
    .where(eq(webhookEndpoints.id, endpointId))
    .returning();

  // Audit log
  await logAudit(db, {
    userId,
    action: "webhook_endpoint.updated",
    resourceType: "webhook_endpoint",
    resourceId: endpointId,
    metadata: { ...data },
  });
    
  return updated || endpoint;
};

export const deleteWebhookEndpoint = async (userId: string, endpointId: string) => {
  const [deleted] = await db.delete(webhookEndpoints)
    .where(and(eq(webhookEndpoints.id, endpointId), eq(webhookEndpoints.userId, userId)))
    .returning();
    
  if (!deleted) throw new NotFoundError("resource:not_found", "webhook_endpoints" as any, "Webhook endpoint not found");

  // Audit log
  await logAudit(db, {
    userId,
    action: "webhook_endpoint.deleted",
    resourceType: "webhook_endpoint",
    resourceId: endpointId,
    metadata: {
      url: deleted.url,
    },
  });
  
  return { success: true };
};

export const listWebhookEvents = async (userId: string, role: string) => {
  const baseQuery = db
    .select({
      id: webhookEvents.id,
      endpointId: webhookEvents.endpointId,
      eventType: webhookEvents.eventType,
      payload: webhookEvents.payload,
      status: webhookEvents.status,
      attempts: webhookEvents.attempts,
      nextAttemptAt: webhookEvents.nextAttemptAt,
      lastError: webhookEvents.lastError,
      createdAt: webhookEvents.createdAt,
      updatedAt: webhookEvents.updatedAt,
      endpointUrl: webhookEndpoints.url,
      endpointDescription: webhookEndpoints.description,
    })
    .from(webhookEvents)
    .innerJoin(webhookEndpoints, eq(webhookEvents.endpointId, webhookEndpoints.id));

  if (role !== "admin") {
    return await baseQuery
      .where(eq(webhookEndpoints.userId, userId))
      .orderBy(desc(webhookEvents.createdAt))
      .limit(50);
  }

  return await baseQuery
    .orderBy(desc(webhookEvents.createdAt))
    .limit(50);
};

export const testWebhookEndpoint = async (
  userId: string,
  endpointId: string,
  mode: "success" | "fail_3_times",
  role?: string,
) => {
  const conditions = [eq(webhookEndpoints.id, endpointId)];
  if (role !== "admin") {
    conditions.push(eq(webhookEndpoints.userId, userId));
  }

  const [endpoint] = await db
    .select()
    .from(webhookEndpoints)
    .where(and(...conditions));

  if (!endpoint) {
    throw new NotFoundError("resource:not_found", "webhook_endpoints" as any, "Webhook endpoint not found");
  }

  const envelope = {
    id: `evt_${uuidv4()}`,
    type: "payment.succeeded",
    createdAt: new Date().toISOString(),
    data: {
      test: true,
      mode,
      message: mode === "fail_3_times" 
        ? "Simulated 3 failures followed by backoff recovery test event" 
        : "Direct success test event",
      endpointId: endpoint.id,
      timestamp: Date.now(),
    },
  };

  const [eventRow] = await db
    .insert(webhookEvents)
    .values({
      endpointId: endpoint.id,
      eventType: "payment.succeeded",
      payload: envelope,
      status: "pending",
      attempts: 0,
    })
    .returning();

  if (!eventRow) {
    throw new Error("Failed to insert test webhook event");
  }

  await outboundQueue.add(
    "webhook-delivery",
    {
      webhookEventId: eventRow.id,
      endpointId: endpoint.id,
      payload: envelope,
      enqueuedAt: Date.now(),
      _test_fail_times: mode === "fail_3_times" ? 3 : undefined,
    },
    {
      jobId: eventRow.id,
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    },
  );

  return eventRow;
};
