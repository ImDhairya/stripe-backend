import {RequestHandler} from "express";
import {db} from "../../db";
import {asyncHandler} from "../../lib/async-handler";
import {CreatePaymentSchema, CapturePaymentSchema} from "./schema";
import {createPayment} from "./services/create-payment";
import {capturePayment} from "./services/capture-payment";
import {cancelPayment} from "./services/cancel-payment";
import {getPayment} from "./services/get-payment";
import {randomUUID} from "crypto";

export const createPaymentHandler = asyncHandler<CreatePaymentSchema>(
  async (req, res) => {
    const user = res.locals.user;
    const idempotencyKey = req.headers["idempotency-key"] as string || randomUUID(); // fallback if middleware not applied properly

    const payment = await db.transaction((tx) => {
      return createPayment(user.id, user.tier, idempotencyKey, req.body, tx);
    });

    return res.status(201).json({
      success: true,
      data: { payment }
    });
  }
);

export const capturePaymentHandler = asyncHandler<CapturePaymentSchema>(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};

    const payment = await db.transaction((tx) => {
      return capturePayment(user.id, user.tier, id, req.body, tx);
    });

    return res.status(200).json({
      success: true,
      data: { payment }
    });
  }
);

export const cancelPaymentHandler = asyncHandler(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};

    const payment = await db.transaction((tx) => {
      return cancelPayment(user.id, user.tier, id, tx);
    });

    return res.status(200).json({
      success: true,
      data: { payment }
    });
  }
);

export const getPaymentHandler = asyncHandler(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};

    const payment = await getPayment(user.id, id);

    return res.status(200).json({
      success: true,
      data: { payment }
    });
  }
);
