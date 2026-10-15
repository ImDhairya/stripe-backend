import z from "zod";

export const createPaymentSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.enum(["inr", "usd", "eur", "gbp"]).default("inr"),
  processor: z.enum(["stripe", "dummy"]).default("dummy"),
  captureMethod: z.enum(["automatic", "manual"]).default("automatic"),
  description: z.string().max(255).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type CreatePaymentSchema = z.infer<typeof createPaymentSchema>;

export const capturePaymentSchema = z.object({
  amount: z.number().int().positive().optional(),
});
export type CapturePaymentSchema = z.infer<typeof capturePaymentSchema>;
