import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { commonFields } from "./common";
import { varchar } from "drizzle-orm/pg-core";
import { decimal } from "drizzle-orm/pg-core";

export const planIntervalEnum = pgEnum("plan_interval", ["month", "year"]);

export const plans = pgTable("plans", {
  ...commonFields,
  name: varchar("name", { length: 255 }).notNull(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }).notNull(),
  stripeProductId: varchar("stripe_product_id", { length: 255 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  interval: planIntervalEnum("interval").notNull(),
});