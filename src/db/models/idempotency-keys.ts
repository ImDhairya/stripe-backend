import {pgTable, varchar, uuid, text, integer, timestamp} from "drizzle-orm/pg-core";
import {users} from "./users";

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: varchar("key", {length: 255}).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, {onDelete: "cascade"}),
  requestHash: varchar("request_hash", {length: 255}).notNull(),
  responseBody: text("response_body"),
  statusCode: integer("status_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type IdempotencyKeyInsert = typeof idempotencyKeys.$inferInsert;
