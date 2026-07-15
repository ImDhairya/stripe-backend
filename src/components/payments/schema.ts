import z from "zod";

export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default("usd"),
  processor: z.enum(["stripe", "dummy"]).default("dummy"),
  captureMethod: z.enum(["automatic", "manual"]).default("automatic"),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type CreatePaymentSchema = z.infer<typeof createPaymentSchema>;

export const capturePaymentSchema = z.object({
  amount: z.number().positive().optional(),
});
export type CapturePaymentSchema = z.infer<typeof capturePaymentSchema>;
