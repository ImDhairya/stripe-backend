import {eq, and} from "drizzle-orm";
import {db} from "../../../db";
import {refunds} from "../../../db/models";
import {NotFoundError} from "../../../lib/errors";

export const getRefund = async (
  userId: string,
  refundId: string
) => {
  const [refund] = await db.select().from(refunds).where(and(eq(refunds.id, refundId), eq(refunds.userId, userId)));
  if (!refund) {
    throw new NotFoundError("resource:not_found", "refunds", "Refund not found");
  }
  return refund;
};
