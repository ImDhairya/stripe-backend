import z from "zod";

export const upgradeUserSchema = z.object({
  userId: z.string().uuid(),
  tier: z.enum(["free", "paid"]),
});

export type UpgradeUserSchema = z.infer<typeof upgradeUserSchema>;
