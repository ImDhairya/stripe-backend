import {pgEnum, pgTable, text, varchar} from "drizzle-orm/pg-core";
import {commonFields} from "./common";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const userTierEnum = pgEnum("user_tier", ["free", "paid"]);

export const users = pgTable("users", {
  ...commonFields,
  name: varchar("name", {length: 255}).notNull(),
  password: text("password").notNull(),
  email: varchar({length: 255}).notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id", {length: 255}),
  role: userRoleEnum("role").notNull().default("user"),
  tier: userTierEnum("tier").notNull().default("free"),
});

export type UserInsert = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
