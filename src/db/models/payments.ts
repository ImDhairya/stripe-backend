import {pgEnum, pgTable, varchar, decimal, jsonb, uuid} from "drizzle-orm/pg-core";
import {commonFields} from "./common";
import {users} from "./users";

export const paymentStatusEnum = pgEnum("payment_status", [
  "requires_payment_method",
  "processing",
  "authorized",
  "succeeded",
  "failed",
  "cancelled",
  "refunded"
]);

export const paymentProcessorEnum = pgEnum("payment_processor", ["stripe", "dummy"]);

export const payments = pgTable("payments", {
  ...commonFields,
  userId: uuid("user_id").notNull().references(() => users.id, {onDelete: "cascade"}),
  amount: decimal("amount", {precision: 10, scale: 2}).notNull(),
  currency: varchar("currency", {length: 3}).notNull().default("usd"),
  status: paymentStatusEnum("status").notNull(),
  processor: paymentProcessorEnum("processor").notNull(),
  processorPaymentId: varchar("processor_payment_id", {length: 255}),
  capturedAmount: decimal("captured_amount", {precision: 10, scale: 2}).default("0"),
  refundedAmount: decimal("refunded_amount", {precision: 10, scale: 2}).default("0"),
  idempotencyKey: varchar("idempotency_key", {length: 255}),
  metadata: jsonb("metadata").default({}),
});

export type Payment = typeof payments.$inferSelect;
export type PaymentInsert = typeof payments.$inferInsert;
