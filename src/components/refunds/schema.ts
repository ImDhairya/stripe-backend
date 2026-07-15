import z from "zod";

export const createRefundSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});
export type CreateRefundSchema = z.infer<typeof createRefundSchema>;
