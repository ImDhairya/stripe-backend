import {RequestHandler} from "express";
import crypto from "crypto";
import {eq} from "drizzle-orm";
import {db} from "../../db";
import {webhookEndpoints} from "../../db/models";
import {asyncHandler} from "../../lib/async-handler";
import {
  CreateWebhookEndpointSchema,
  UpdateWebhookEndpointSchema,
  TestWebhookEndpointSchema,
} from "./schema";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  listWebhookEvents,
  testWebhookEndpoint,
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

export const listWebhookEventsHandler = asyncHandler(
  async (req, res) => {
    const user = res.locals.user;
    const events = await listWebhookEvents(user.id, user.role);
    return res.status(200).json({ success: true, data: events });
  }
);

export const testWebhookEndpointHandler = asyncHandler<TestWebhookEndpointSchema>(
  async (req, res) => {
    const user = res.locals.user;
    const {id} = req.params as {id: string};
    const mode = req.body?.mode || "success";
    const event = await testWebhookEndpoint(user.id, id, mode, user.role);
    return res.status(200).json({ success: true, data: event });
  }
);

export const sandboxReceiverHandler = asyncHandler(
  async (req, res) => {
    const {endpointId} = req.params as {endpointId: string};
    const [endpoint] = await db
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.id, endpointId));

    if (!endpoint) {
      return res.status(404).json({ success: false, error: "Endpoint not found" });
    }

    const sigHeader = (req.headers["stripe-signature"] || req.headers["Stripe-Signature"]) as string;
    if (!sigHeader) {
      return res.status(400).json({ success: false, error: "Missing Stripe-Signature header" });
    }

    const parts = sigHeader.split(",").reduce((acc, part) => {
      const [k, v] = part.split("=");
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {} as Record<string, string>);

    const timestamp = parts.t;
    const signature = parts.v1;

    if (!timestamp || !signature) {
      return res.status(400).json({ success: false, error: "Invalid signature format in header" });
    }

    const rawBody = (req as any).rawBody ? (req as any).rawBody.toString() : JSON.stringify(req.body);
    const expectedSig = crypto
      .createHmac("sha256", endpoint.secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSig, "hex");

    const signatureValid =
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!signatureValid) {
      return res.status(400).json({
        verified: false,
        receivedAt: new Date().toISOString(),
        signatureValid: false,
        error: "HMAC signature mismatch",
      });
    }

    return res.status(200).json({
      verified: true,
      receivedAt: new Date().toISOString(),
      signatureValid: true,
    });
  }
);
