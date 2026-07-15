import {pgEnum, pgTable, varchar, decimal, uuid} from "drizzle-orm/pg-core";
import {commonFields} from "./common";
import {users} from "./users";
import {payments} from "./payments";

export const refundStatusEnum = pgEnum("refund_status", ["pending", "succeeded", "failed"]);

export const refunds = pgTable("refunds", {
  ...commonFields,
  paymentId: uuid("payment_id").notNull().references(() => payments.id, {onDelete: "cascade"}),
  userId: uuid("user_id").notNull().references(() => users.id, {onDelete: "cascade"}),
  amount: decimal("amount", {precision: 10, scale: 2}).notNull(),
  status: refundStatusEnum("status").notNull(),
  processorRefundId: varchar("processor_refund_id", {length: 255}),
  reason: varchar("reason", {length: 255}),
});

export type Refund = typeof refunds.$inferSelect;
export type RefundInsert = typeof refunds.$inferInsert;
