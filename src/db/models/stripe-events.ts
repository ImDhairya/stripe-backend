import {pgTable, varchar, boolean, timestamp} from "drizzle-orm/pg-core";

export const stripeEvents = pgTable("stripe_events", {
  id: varchar("id", {length: 255}).primaryKey(), // Stripe event ID (evt_...)
  type: varchar("type", {length: 255}).notNull(),
  processed: boolean("processed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StripeEvent = typeof stripeEvents.$inferSelect;
export type StripeEventInsert = typeof stripeEvents.$inferInsert;
