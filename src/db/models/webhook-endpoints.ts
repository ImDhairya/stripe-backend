import {pgTable, varchar, uuid, boolean} from "drizzle-orm/pg-core";
import {commonFields} from "./common";
import {users} from "./users";

export const webhookEndpoints = pgTable("webhook_endpoints", {
  ...commonFields,
  userId: uuid("user_id").notNull().references(() => users.id, {onDelete: "cascade"}),
  url: varchar("url", {length: 2048}).notNull(),
  secret: varchar("secret", {length: 255}).notNull(),
  description: varchar("description", {length: 255}),
  isActive: boolean("is_active").default(true).notNull(),
});

export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type WebhookEndpointInsert = typeof webhookEndpoints.$inferInsert;
