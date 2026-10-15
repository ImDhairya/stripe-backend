import {DBConnection} from "../db";
import {auditLogs} from "../db/models";

export interface LogAuditParams {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
}

export const logAudit = async (
  tx: DBConnection,
  params: LogAuditParams,
) => {
  const [audit] = await tx
    .insert(auditLogs)
    .values({
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata || {},
    })
    .returning();

  return audit;
};
