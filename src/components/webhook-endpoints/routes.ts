import {Route} from "../../types";
import {
  createEndpointHandler,
  listEndpointsHandler,
  updateEndpointHandler,
  deleteEndpointHandler
} from "./controller";
import {createWebhookEndpointSchema, updateWebhookEndpointSchema} from "./schema";
import {requireTier} from "../../middlewares/authorize";

const routes: Route[] = [
  {
    method: "post",
    path: "/v1/webhook-endpoints",
    schema: createWebhookEndpointSchema,
    middlewares: [requireTier("paid")], // restricted to paid tier
    handler: createEndpointHandler,
  },
  {
    method: "get",
    path: "/v1/webhook-endpoints",
    middlewares: [requireTier("paid")],
    handler: listEndpointsHandler,
  },
  {
    method: "put",
    path: "/v1/webhook-endpoints/:id",
    schema: updateWebhookEndpointSchema,
    middlewares: [requireTier("paid")],
    handler: updateEndpointHandler,
  },
  {
    method: "delete",
    path: "/v1/webhook-endpoints/:id",
    middlewares: [requireTier("paid")],
    handler: deleteEndpointHandler,
  }
];

export default routes;
