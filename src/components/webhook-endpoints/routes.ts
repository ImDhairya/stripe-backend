import {Route} from "../../types";
import {
  createEndpointHandler,
  listEndpointsHandler,
  updateEndpointHandler,
  deleteEndpointHandler,
  listWebhookEventsHandler,
  testWebhookEndpointHandler,
  sandboxReceiverHandler,
} from "./controller";
import {
  createWebhookEndpointSchema,
  updateWebhookEndpointSchema,
  testWebhookEndpointSchema,
} from "./schema";
import {requireTier} from "../../middlewares/authorize";

const routes: Route[] = [
  {
    method: "post",
    path: "/v1/webhook-endpoints/sandbox-receiver/:endpointId",
    isPublic: true,
    handler: sandboxReceiverHandler,
  },
  {
    method: "get",
    path: "/v1/webhook-endpoints/events",
    middlewares: [requireTier("paid")],
    handler: listWebhookEventsHandler,
  },
  {
    method: "post",
    path: "/v1/webhook-endpoints/:id/test",
    schema: testWebhookEndpointSchema,
    middlewares: [requireTier("paid")],
    handler: testWebhookEndpointHandler,
  },
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
  },
];

export default routes;
