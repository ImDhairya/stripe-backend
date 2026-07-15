import z from "zod";

export const searchSchema = z.object({
  q: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.enum(["asc", "desc"]).default("desc"),
});

export type SearchSchema = z.infer<typeof searchSchema>;
