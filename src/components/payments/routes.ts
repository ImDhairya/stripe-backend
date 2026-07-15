import {Route} from "../../types";
import {idempotency} from "../../middlewares/idempotency";
import {rateLimit} from "../../middlewares/rate-limit";
import {quota} from "../../middlewares/quota";
import {
  createPaymentHandler,
  capturePaymentHandler,
  cancelPaymentHandler,
  getPaymentHandler
} from "./controller";
import {createPaymentSchema, capturePaymentSchema} from "./schema";

const routes: Route[] = [
  {
    method: "post",
    path: "/v1/payments",
    schema: createPaymentSchema,
    middlewares: [rateLimit, quota, idempotency],
    handler: createPaymentHandler,
  },
  {
    method: "post",
    path: "/v1/payments/:id/capture",
    schema: capturePaymentSchema,
    middlewares: [rateLimit, quota], // Not requiring idempotency here for simplicity, but rate/quota applies
    handler: capturePaymentHandler,
  },
  {
    method: "post",
    path: "/v1/payments/:id/cancel",
    middlewares: [rateLimit],
    handler: cancelPaymentHandler,
  },
  {
    method: "get",
    path: "/v1/payments/:id",
    middlewares: [rateLimit],
    handler: getPaymentHandler,
  }
];

export default routes;
