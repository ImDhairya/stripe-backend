import {RequestHandler} from "express";
import {asyncHandler} from "../../lib/async-handler";
import {CreateWebhookEndpointSchema, UpdateWebhookEndpointSchema} from "./schema";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  updateWebhookEndpoint,
  deleteWebhookEndpoint
} from "./services";

export const createEndpointHandler = asyncHandler<CreateWebhookEndpointSchema>(
  async (req, res) => {
    const user = res.locals.user;
    const endpoint = await createWebhookEndpoint(user.id, req.body);
    return res.status(201).json({ success: true, data: { endpoint } });
  }
);

export const listEndpointsHandler = asyncHandler(
  async (req, res) => {
    const user = res.locals.user;
    const endpoints = await listWebhookEndpoints(user.id);
    return res.status(200).json({ success: true, data: { endpoints } });
  }
);

export const updateEndpointHandler = asyncHandler<UpdateWebhookEndpointSchema>(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};
    const endpoint = await updateWebhookEndpoint(user.id, id, req.body);
    return res.status(200).json({ success: true, data: { endpoint } });
  }
);

export const deleteEndpointHandler = asyncHandler(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};
    await deleteWebhookEndpoint(user.id, id);
    return res.status(200).json({ success: true });
  }
);
