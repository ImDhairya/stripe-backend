import z from "zod";

export const createWebhookEndpointSchema = z.object({
  url: z.string().url().max(2048),
  description: z.string().max(255).optional(),
});

export type CreateWebhookEndpointSchema = z.infer<typeof createWebhookEndpointSchema>;

export const updateWebhookEndpointSchema = z.object({
  url: z.string().url().max(2048).optional(),
  description: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWebhookEndpointSchema = z.infer<typeof updateWebhookEndpointSchema>;
