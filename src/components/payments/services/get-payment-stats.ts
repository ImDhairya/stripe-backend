import {db} from "../../../db";
import {payments} from "../../../db/models";
import {eq, and, sql, gte} from "drizzle-orm";

export const getPaymentStats = async (userId: string, role: string) => {
  const whereClause = role === "admin" ? undefined : eq(payments.userId, userId);

  // Status counts and volumes
  const statsQuery = await db
    .select({
      status: payments.status,
      currency: payments.currency,
      count: sql<number>`count(*)`,
      volume: sql<number>`coalesce(sum(cast(${payments.amount} as numeric)), 0)`,
      capturedVolume: sql<number>`coalesce(sum(cast(${payments.capturedAmount} as numeric)), 0)`,
      refundedVolume: sql<number>`coalesce(sum(cast(${payments.refundedAmount} as numeric)), 0)`,
    })
    .from(payments)
    .where(whereClause)
    .groupBy(payments.status, payments.currency);

  let totalPayments = 0;
  let successfulPayments = 0;
  let authorizedPayments = 0;
  let failedPayments = 0;
  let refundedPayments = 0;
  let totalRefundedVolume = 0;
  let authorizedVolume = 0;
  let settledVolume = 0;
  const totalVolumeByCurrency: Record<string, number> = {};

  for (const row of statsQuery) {
    const count = Number(row.count || 0);
    const volume = Number(row.volume || 0);
    const refunded = Number(row.refundedVolume || 0);
    const currency = (row.currency || "inr").toLowerCase();

    totalPayments += count;
    totalRefundedVolume += refunded;

    if (row.status === "succeeded") {
      successfulPayments += count;
      settledVolume += volume;
      totalVolumeByCurrency[currency] = (totalVolumeByCurrency[currency] || 0) + volume;
    } else if (row.status === "authorized") {
      authorizedPayments += count;
      authorizedVolume += volume;
    } else if (row.status === "failed") {
      failedPayments += count;
    } else if (row.status === "refunded") {
      refundedPayments += count;
      totalVolumeByCurrency[currency] = (totalVolumeByCurrency[currency] || 0) + volume;
    }
  }

  // 7-day daily volume
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dailyConditions = [gte(payments.createdAt, sevenDaysAgo)];
  if (role !== "admin") {
    dailyConditions.push(eq(payments.userId, userId));
  }

  const dailyStats = await db
    .select({
      date: sql<string>`to_char(${payments.createdAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)`,
      volume: sql<number>`coalesce(sum(cast(${payments.amount} as numeric)), 0)`,
    })
    .from(payments)
    .where(and(...dailyConditions))
    .groupBy(sql`to_char(${payments.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${payments.createdAt}, 'YYYY-MM-DD')`);

  return {
    totalPayments,
    successfulPayments,
    authorizedPayments,
    failedPayments,
    refundedPayments,
    settledVolume,
    authorizedVolume,
    totalVolumeByCurrency,
    totalRefundedVolume,
    successRate: totalPayments > 0 ? Math.round((successfulPayments / totalPayments) * 100) : 100,
    dailyBreakdown: dailyStats.map((d) => ({
      date: d.date,
      count: Number(d.count || 0),
      volume: Number(d.volume || 0),
    })),
  };
};
