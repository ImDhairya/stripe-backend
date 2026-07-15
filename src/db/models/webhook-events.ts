import {pgTable, varchar, uuid, jsonb, integer, timestamp, pgEnum} from "drizzle-orm/pg-core";
import {commonFields} from "./common";
import {webhookEndpoints} from "./webhook-endpoints";

export const webhookEventStatusEnum = pgEnum("webhook_event_status", [
  "pending",
  "succeeded",
  "failed"
]);

export const webhookEvents = pgTable("webhook_events", {
  ...commonFields,
  endpointId: uuid("endpoint_id").notNull().references(() => webhookEndpoints.id, {onDelete: "cascade"}),
  eventType: varchar("event_type", {length: 255}).notNull(),
  payload: jsonb("payload").notNull(),
  status: webhookEventStatusEnum("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  nextAttemptAt: timestamp("next_attempt_at"),
  lastError: varchar("last_error", {length: 1024}),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type WebhookEventInsert = typeof webhookEvents.$inferInsert;
