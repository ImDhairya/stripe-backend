import {db} from "../../../db";
import {payments, refunds, auditLogs, users} from "../../../db/models";
import {SearchSchema} from "../schema";
import {desc, asc, eq, and, or, sql, gte, lte, ilike} from "drizzle-orm";
import {NotFoundError} from "../../../lib/errors";

const getSearchConditions = (
  table: any,
  userId: string,
  role: string,
  resource: string,
  q?: string,
  status?: string,
  from?: string,
  to?: string,
) => {
  const conditions = [];

  // Role scoping: normal users only see their own data
  // Users resource is admin-only (enforced in controller), so skip userId scoping
  if (role !== "admin" && resource !== "users") {
    conditions.push(eq(table.userId, userId));
  }

  if (status && "status" in table) {
    conditions.push(eq(table.status, status as any));
  }

  if (q) {
    if (resource === "users") {
      conditions.push(or(ilike(table.email, `%${q}%`), ilike(table.name, `%${q}%`)));
    } else if (resource === "payments") {
      conditions.push(
        or(
          sql`${table.id}::text ILIKE ${`%${q}%`}`,
          sql`${table.status}::text ILIKE ${`%${q}%`}`,
          sql`${table.processor}::text ILIKE ${`%${q}%`}`,
          ilike(table.currency, `%${q}%`),
        ),
      );
    } else if (resource === "refunds") {
      conditions.push(
        or(
          sql`${table.id}::text ILIKE ${`%${q}%`}`,
          sql`${table.paymentId}::text ILIKE ${`%${q}%`}`,
          ilike(table.reason, `%${q}%`),
        ),
      );
    } else if (resource === "audit-logs") {
      conditions.push(
        or(
          ilike(table.action, `%${q}%`),
          ilike(table.resourceType, `%${q}%`),
          ilike(table.resourceId, `%${q}%`),
        ),
      );
    } else {
      conditions.push(sql`${table.id}::text ILIKE ${`%${q}%`}`);
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
    case "audit-logs":
      table = auditLogs;
      break;
    case "users":
      table = users;
      break;
    default:
      throw new NotFoundError("resource:not_found", "audit_logs" as any, `Resource ${resource} not found`);
  }

  const conditions = getSearchConditions(
    table,
    userId,
    role,
    resource,
    query.q,
    query.status,
    query.from,
    query.to,
  );
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

  const limit = Math.max(1, Number(query.limit) || 10);
  const offset = Math.max(0, Number(query.offset) || 0);

  const data = selectFields
    ? await db.select(selectFields).from(table).where(whereClause).orderBy(orderBy).limit(limit).offset(offset)
    : await db.select().from(table).where(whereClause).orderBy(orderBy).limit(limit).offset(offset);

  return {
    data,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + data.length < total
    }
  };
};
