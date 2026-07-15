import {RequestHandler} from "express";
import {db} from "../../db";
import {asyncHandler} from "../../lib/async-handler";
import {UpgradeUserSchema} from "./schema";
import upgradeUser from "./services/upgrade-user";

export const upgradeUserHandler = asyncHandler<UpgradeUserSchema>(
  async (req, res) => {
    const {userId, tier} = req.body;

    const user = await db.transaction((tx) => {
      return upgradeUser(userId, tier, tx);
    });

    return res.status(200).json({
      success: true,
      message: `User upgraded to ${tier} successfully.`,
      data: {
        user: {id: user.id, email: user.email, role: user.role, tier: user.tier},
      },
    });
  },
);
