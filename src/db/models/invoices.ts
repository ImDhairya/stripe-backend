import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import { commonFields } from "./common";
import { uuid } from "drizzle-orm/pg-core";
import { varchar } from "drizzle-orm/pg-core";
import { users } from "./users";
import { decimal } from "drizzle-orm/pg-core";

export const invoiceStatusEnum = pgEnum("invoice_status", ["paid", "open", "void", "uncollectible"]);

export const invoices = pgTable("invoices", {
  ...commonFields,
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum("status").notNull(),
  invoicePdfUrl: varchar("invoice_pdf_url", { length: 1024 }),
});