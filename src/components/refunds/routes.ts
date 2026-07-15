import {Route} from "../../types";
import {requireTier} from "../../middlewares/authorize";
import {rateLimit} from "../../middlewares/rate-limit";
import {createRefundHandler, getRefundHandler} from "./controller";
import {createRefundSchema} from "./schema";

const routes: Route[] = [
  {
    method: "post",
    path: "/v1/payments/:paymentId/refund",
    schema: createRefundSchema,
    middlewares: [requireTier("paid"), rateLimit], // Restricted to paid users
    handler: createRefundHandler,
  },
  {
    method: "get",
    path: "/v1/refunds/:id",
    middlewares: [requireTier("paid"), rateLimit], // Restricted to paid users
    handler: getRefundHandler,
  }
];

export default routes;
