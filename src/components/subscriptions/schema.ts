import z from "zod";

export const createSubscriptionSchema = z.object({
  processor: z.enum(["stripe", "dummy"]).default("dummy"),
  planId: z.string(),
});
export type CreateSubscriptionSchema = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  planId: z.string(),
});
export type UpdateSubscriptionSchema = z.infer<typeof updateSubscriptionSchema>;

export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
});
export type CancelSubscriptionSchema = z.infer<typeof cancelSubscriptionSchema>;
