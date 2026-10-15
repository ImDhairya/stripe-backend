import z from "zod";

export const searchSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z.string().optional().default("desc").transform((val) => {
    if (val?.toLowerCase().includes("asc")) return "asc" as const;
    return "desc" as const;
  }),
});

export type SearchSchema = z.infer<typeof searchSchema>;
