import z from "zod";

export const upgradeUserSchema = z.object({
  userId: z.string().uuid(),
  tier: z.enum(["free", "paid"]).optional(),
  newTier: z.enum(["free", "paid"]).optional(),
}).transform((data) => ({
  userId: data.userId,
  tier: (data.tier || data.newTier || "paid") as "free" | "paid",
}));

export type UpgradeUserSchema = z.infer<typeof upgradeUserSchema>;
