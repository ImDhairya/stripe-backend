import {v4 as uuidv4} from "uuid";
import {eq, and} from "drizzle-orm";
import {db} from "../db";
import {webhookEndpoints, webhookEvents} from "../db/models";
import {outboundQueue} from "./bullmq";
import pino from "pino";

const logger = pino({ name: "webhook-dispatcher" });

export interface DispatchWebhookOptions {
  failTimes?: number;
  specificEndpointId?: string;
}

export const dispatchWebhookEvent = async (
  userId: string,
  eventType: string,
  dataPayload: Record<string, any>,
  options?: DispatchWebhookOptions,
) => {
  try {
    let endpoints;
    if (options?.specificEndpointId) {
      endpoints = await db
        .select()
        .from(webhookEndpoints)
        .where(
          and(
            eq(webhookEndpoints.id, options.specificEndpointId),
            eq(webhookEndpoints.userId, userId),
            eq(webhookEndpoints.isActive, true),
          ),
        );
    } else {
      endpoints = await db
        .select()
        .from(webhookEndpoints)
        .where(
          and(
            eq(webhookEndpoints.userId, userId),
            eq(webhookEndpoints.isActive, true),
          ),
        );
    }

    if (!endpoints || endpoints.length === 0) {
      logger.info({ userId, eventType }, "No active webhook endpoints for user");
      return [];
    }

    const createdEvents = [];

    for (const endpoint of endpoints) {
      const envelope = {
        id: `evt_${uuidv4()}`,
        type: eventType,
        createdAt: new Date().toISOString(),
        data: { ...dataPayload },
      };

      const [eventRow] = await db
        .insert(webhookEvents)
        .values({
          endpointId: endpoint.id,
          eventType,
          payload: envelope,
          status: "pending",
          attempts: 0,
        })
        .returning();

      if (!eventRow) {
        continue;
      }

      await outboundQueue.add(
        "webhook-delivery",
        {
          webhookEventId: eventRow.id,
          endpointId: endpoint.id,
          payload: envelope,
          enqueuedAt: Date.now(),
          _test_fail_times: options?.failTimes,
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

      createdEvents.push(eventRow);
    }

    logger.info({ userId, eventType, count: createdEvents.length }, "Dispatched webhook events");
    return createdEvents;
  } catch (err) {
    logger.error({ userId, eventType, err }, "Failed to dispatch webhook event");
    return [];
  }
};
