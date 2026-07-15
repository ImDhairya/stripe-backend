import {db} from "../../../db";
import {payments, refunds, subscriptions, auditLogs, users} from "../../../db/models";
import {SearchSchema} from "../schema";
import {desc, asc, eq, and, or, sql, gte, lte, ilike} from "drizzle-orm";
import {NotFoundError} from "../../../lib/errors";

const getSearchConditions = (table: any, userId: string, role: string, resource: string, q?: string, from?: string, to?: string) => {
  const conditions = [];

  // Role scoping: normal users only see their own data
  // Users resource is admin-only (enforced in controller), so skip userId scoping
  if (role !== "admin" && resource !== "users") {
    conditions.push(eq(table.userId, userId));
  }

  if (q) {
    if (resource === "users") {
      // Search users by email or name (partial match)
      conditions.push(or(ilike(table.email, `%${q}%`), ilike(table.name, `%${q}%`)));
    } else {
      conditions.push(eq(table.id, q));
    }
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
    case "users":
      table = users;
      break;
    default:
      throw new NotFoundError("resource:not_found", "audit_logs" as any, `Resource ${resource} not found`);
  }

  const conditions = getSearchConditions(table, userId, role, resource, query.q, query.from, query.to);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  const orderBy = query.sort === "desc" ? desc(table.createdAt) : asc(table.createdAt);

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(table).where(whereClause);
  const total = Number(countResult?.count || 0);

  // For users, exclude sensitive fields (password)
  const selectFields = resource === "users" 
    ? {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        tier: users.tier,
        stripeCustomerId: users.stripeCustomerId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }
    : undefined;

  const data = selectFields
    ? await db.select(selectFields).from(table).where(whereClause).orderBy(orderBy).limit(query.limit).offset(query.offset)
    : await db.select().from(table).where(whereClause).orderBy(orderBy).limit(query.limit).offset(query.offset);

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
