import {pgTable, varchar, uuid, jsonb} from "drizzle-orm/pg-core";
import {commonFields} from "./common";
import {users} from "./users";

export const auditLogs = pgTable("audit_logs", {
  ...commonFields,
  userId: uuid("user_id").notNull().references(() => users.id, {onDelete: "cascade"}),
  action: varchar("action", {length: 255}).notNull(),
  resourceType: varchar("resource_type", {length: 255}).notNull(),
  resourceId: varchar("resource_id", {length: 255}).notNull(),
  metadata: jsonb("metadata"),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type AuditLogInsert = typeof auditLogs.$inferInsert;
