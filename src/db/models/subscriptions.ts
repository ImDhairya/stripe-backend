import { pgEnum, uuid, pgTable } from "drizzle-orm/pg-core";
import { commonFields } from "./common";
import { users } from "./users";
import { plans } from "./plans";
import { varchar } from "drizzle-orm/pg-core";
import { timestamp } from "drizzle-orm/pg-core";
import { boolean } from "drizzle-orm/pg-core";

export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "past_due"]);

export const subscriptions = pgTable("subscriptions", {
  ...commonFields,
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "restrict" }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).notNull(),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
});