import {RequestHandler} from "express";
import {db} from "../../db";
import {asyncHandler} from "../../lib/async-handler";
import {CreateSubscriptionSchema, UpdateSubscriptionSchema, CancelSubscriptionSchema} from "./schema";
import {createSubscription} from "./services/create-subscription";
import {updateSubscription} from "./services/update-subscription";
import {cancelSubscription} from "./services/cancel-subscription";
import {getSubscription} from "./services/get-subscription";

export const createSubscriptionHandler = asyncHandler<CreateSubscriptionSchema>(
  async (req, res) => {
    const user = res.locals.user;
    
    // Using dummy customer IDs if not integrated with Stripe Customers fully
    const stripeCustomerId = user.stripeCustomerId;

    const subscription = await db.transaction((tx) => {
      return createSubscription(user.id, user.tier, stripeCustomerId, req.body, tx);
    });

    return res.status(201).json({
      success: true,
      data: { subscription }
    });
  }
);

export const updateSubscriptionHandler = asyncHandler<UpdateSubscriptionSchema>(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};

    const subscription = await db.transaction((tx) => {
      return updateSubscription(user.id, user.tier, id, req.body, tx);
    });

    return res.status(200).json({
      success: true,
      data: { subscription }
    });
  }
);

export const cancelSubscriptionHandler = asyncHandler<CancelSubscriptionSchema>(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};

    const subscription = await db.transaction((tx) => {
      return cancelSubscription(user.id, user.tier, id, req.body, tx);
    });

    return res.status(200).json({
      success: true,
      data: { subscription }
    });
  }
);

export const getSubscriptionHandler = asyncHandler(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};

    const subscription = await getSubscription(user.id, id);

    return res.status(200).json({
      success: true,
      data: { subscription }
    });
  }
);
