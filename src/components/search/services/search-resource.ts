import {db} from "../../../db";
import {payments, refunds, subscriptions, auditLogs} from "../../../db/models";
import {SearchSchema} from "../schema";
import {desc, asc, eq, and, or, sql, gte, lte} from "drizzle-orm";
import {NotFoundError} from "../../../lib/errors";

const getSearchConditions = (table: any, userId: string, role: string, q?: string, from?: string, to?: string) => {
  const conditions = [];

  // Role scoping: normal users only see their own data
  if (role !== "admin") {
    // Audit logs don't have a userId if they are system level, but assuming they do here
    // In our model auditLogs has userId
    conditions.push(eq(table.userId, userId));
  }

  if (q) {
    conditions.push(eq(table.id, q));
  }

  if (from) {
    conditions.push(gte(table.createdAt, new Date(from)));
  }

  if (to) {
    conditions.push(lte(table.createdAt, new Date(to)));
  }

  return conditions;
};

export const searchResource = async (resource: string, userId: string, role: string, query: SearchSchema) => {
  let table: any;

  switch (resource) {
    case "payments":
      table = payments;
      break;
    case "refunds":
      table = refunds;
      break;
    case "subscriptions":
      table = subscriptions;
      break;
    case "audit-logs":
      table = auditLogs;
      break;
    default:
      throw new NotFoundError("resource:not_found", "audit_logs" as any, `Resource ${resource} not found`);
  }

  const conditions = getSearchConditions(table, userId, role, query.q, query.from, query.to);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const orderBy = query.sort === "desc" ? desc(table.createdAt) : asc(table.createdAt);

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(table).where(whereClause);
  const total = Number(countResult?.count || 0);

  const data = await db.select()
    .from(table)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(query.limit)
    .offset(query.offset);

  return {
    data,
    pagination: {
      limit: query.limit,
      offset: query.offset,
      total,
      hasMore: query.offset + data.length < total
    }
  };
};
