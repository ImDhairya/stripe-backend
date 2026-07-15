import {pgEnum, pgTable, varchar, uuid, timestamp} from "drizzle-orm/pg-core";
import {commonFields} from "./common";
import {users} from "./users";

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused"
]);

export const subscriptions = pgTable("subscriptions", {
  ...commonFields,
  userId: uuid("user_id").notNull().references(() => users.id, {onDelete: "cascade"}),
  planId: varchar("plan_id", {length: 255}).notNull(),
  status: subscriptionStatusEnum("status").notNull().default("incomplete"),
  processorSubscriptionId: varchar("processor_subscription_id", {length: 255}).notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: timestamp("cancel_at_period_end"),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionInsert = typeof subscriptions.$inferInsert;
