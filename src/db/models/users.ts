import {pgTable, text, varchar} from "drizzle-orm/pg-core";
import {commonFields} from "./common";

export const users = pgTable("users", {
  ...commonFields,
  name: varchar("name", {length: 255}).notNull(),
  password: text("password").notNull(),
  email: varchar({length: 255}).notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id", {length: 255}),
});

export type UserInsert = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
