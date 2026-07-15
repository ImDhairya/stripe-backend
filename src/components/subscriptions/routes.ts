import {Route} from "../../types";
import {rateLimit} from "../../middlewares/rate-limit";
import {
  createSubscriptionHandler,
  updateSubscriptionHandler,
  cancelSubscriptionHandler,
  getSubscriptionHandler
} from "./controller";
import {createSubscriptionSchema, updateSubscriptionSchema, cancelSubscriptionSchema} from "./schema";

const routes: Route[] = [
  {
    method: "post",
    path: "/v1/subscriptions",
    schema: createSubscriptionSchema,
    middlewares: [rateLimit],
    handler: createSubscriptionHandler,
  },
  {
    method: "post",
    path: "/v1/subscriptions/:id", // update plan
    schema: updateSubscriptionSchema,
    middlewares: [rateLimit],
    handler: updateSubscriptionHandler,
  },
  {
    method: "post",
    path: "/v1/subscriptions/:id/cancel",
    schema: cancelSubscriptionSchema,
    middlewares: [rateLimit],
    handler: cancelSubscriptionHandler,
  },
  {
    method: "get",
    path: "/v1/subscriptions/:id",
    middlewares: [rateLimit],
    handler: getSubscriptionHandler,
  }
];

export default routes;
