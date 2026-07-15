import {RequestHandler} from "express";
import {db} from "../../db";
import {asyncHandler} from "../../lib/async-handler";
import {CreateRefundSchema} from "./schema";
import {createRefund} from "./services/create-refund";
import {getRefund} from "./services/get-refund";

export const createRefundHandler = asyncHandler<CreateRefundSchema>(
  async (req, res) => {
    const user = res.locals.user;
    const {paymentId} = req.params as {paymentId: string};

    const refund = await db.transaction((tx) => {
      return createRefund(user.id, user.tier, paymentId, req.body, tx);
    });

    return res.status(201).json({
      success: true,
      data: { refund }
    });
  }
);

export const getRefundHandler = asyncHandler(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};

    const refund = await getRefund(user.id, id);

    return res.status(200).json({
      success: true,
      data: { refund }
    });
  }
);
