import * as argon from "argon2";
import crypto from "crypto";
import {v4 as uuidv4} from "uuid";
import {eq, and, sql} from "drizzle-orm";
import {db} from "../db";
import {users, payments, refunds, webhookEndpoints, webhookEvents, auditLogs} from "../db/models";
import env from "./env";
import pino from "pino";

const logger = pino({ name: "seed-demo" });

export const seedDemoData = async () => {
  try {
    logger.info("Checking / running deterministic demo seeder...");

    const adminPasswordHash = await argon.hash("Admin@12345");
    const merchantPasswordHash = await argon.hash("Merchant@12345");

    // 1. Upsert Admin account
    let [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@paygate.com"));

    if (!adminUser) {
      [adminUser] = await db
        .insert(users)
        .values({
          email: "admin@paygate.com",
          name: "Assessor Admin",
          password: adminPasswordHash,
          role: "admin",
          tier: "paid",
        })
        .returning();
      logger.info("Created Assessor Admin account: admin@paygate.com");
    } else {
      [adminUser] = await db
        .update(users)
        .set({
          name: "Assessor Admin",
          password: adminPasswordHash,
          role: "admin",
          tier: "paid",
        })
        .where(eq(users.id, adminUser.id))
        .returning();
    }

    // 2. Upsert Merchant account
    let [merchantUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "merchant@paygate.com"));

    if (!merchantUser) {
      [merchantUser] = await db
        .insert(users)
        .values({
          email: "merchant@paygate.com",
          name: "Demo Merchant",
          password: merchantPasswordHash,
          role: "user",
          tier: "paid",
        })
        .returning();
      logger.info("Created Demo Merchant account: merchant@paygate.com");
    } else {
      [merchantUser] = await db
        .update(users)
        .set({
          name: "Demo Merchant",
          password: merchantPasswordHash,
          role: "user",
          tier: "paid",
        })
        .where(eq(users.id, merchantUser.id))
        .returning();
    }

    if (!merchantUser || !adminUser) return;

    // 3. Check if demo payments already exist for merchantUser
    const [existingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(eq(payments.userId, merchantUser.id));

    if (Number(existingCount?.count || 0) > 0) {
      logger.info("Demo data already present for merchant. Skipping seed.");
      return { seeded: false, message: "Demo data already exists" };
    }

    logger.info("Seeding realistic sample data for demo merchant and assessor admin...");

    // 4. Create Built-in Sandbox Webhook Endpoint for Merchant
    const endpointSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const [endpoint] = await db
      .insert(webhookEndpoints)
      .values({
        userId: merchantUser.id,
        url: `${env.WEBHOOK_BASE}/api/v1/webhook-endpoints/sandbox-receiver/placeholder`,
        description: "Built-in Evaluator Sandbox Receiver",
        secret: endpointSecret,
        isActive: true,
      })
      .returning();

    if (!endpoint) throw new Error("Failed to create demo endpoint");

    const realSandboxUrl = `${env.WEBHOOK_BASE}/api/v1/webhook-endpoints/sandbox-receiver/${endpoint.id}`;
    await db
      .update(webhookEndpoints)
      .set({ url: realSandboxUrl })
      .where(eq(webhookEndpoints.id, endpoint.id));

    // Also give Admin an active sandbox endpoint
    const adminEndpointSecret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const [adminEp] = await db
      .insert(webhookEndpoints)
      .values({
        userId: adminUser.id,
        url: `${env.WEBHOOK_BASE}/api/v1/webhook-endpoints/sandbox-receiver/admin-placeholder`,
        description: "Admin Built-in Sandbox Receiver",
        secret: adminEndpointSecret,
        isActive: true,
      })
      .returning();

    if (adminEp) {
      await db
        .update(webhookEndpoints)
        .set({
          url: `${env.WEBHOOK_BASE}/api/v1/webhook-endpoints/sandbox-receiver/${adminEp.id}`,
        })
        .where(eq(webhookEndpoints.id, adminEp.id));
    }

    // 5. Seed 8 realistic payments for Merchant
    const now = Date.now();
    const daysAgo = (days: number, hours: number = 0) =>
      new Date(now - (days * 86400000 + hours * 3600000));

    // Payment 1: ₹1,500.00 Succeeded (INR)
    const [p1] = await db.insert(payments).values({
      userId: merchantUser.id,
      amount: "150000",
      currency: "inr",
      status: "succeeded",
      processor: "dummy",
      processorPaymentId: `dummy_ch_${uuidv4()}`,
      capturedAmount: "150000",
      refundedAmount: "0",
      idempotencyKey: `idem_seed_${uuidv4()}`,
      metadata: { description: "Enterprise SaaS Annual Plan", customer: "Acme Corp" },
      createdAt: daysAgo(6, 2),
    }).returning();

    // Payment 2: ₹499.00 Succeeded (INR)
    const [p2] = await db.insert(payments).values({
      userId: merchantUser.id,
      amount: "49900",
      currency: "inr",
      status: "succeeded",
      processor: "dummy",
      processorPaymentId: `dummy_ch_${uuidv4()}`,
      capturedAmount: "49900",
      refundedAmount: "0",
      idempotencyKey: `idem_seed_${uuidv4()}`,
      metadata: { description: "Monthly Pro Subscription", plan: "pro-tier" },
      createdAt: daysAgo(5, 5),
    }).returning();

    // Payment 3: ₹1,250.00 Authorized hold waiting for capture (INR)
    const [p3] = await db.insert(payments).values({
      userId: merchantUser.id,
      amount: "125000",
      currency: "inr",
      status: "authorized",
      processor: "dummy",
      processorPaymentId: `dummy_pi_${uuidv4()}`,
      capturedAmount: "0",
      refundedAmount: "0",
      idempotencyKey: `idem_seed_${uuidv4()}`,
      metadata: { description: "Hardware Deposit Hold", holdReason: "rental_deposit" },
      createdAt: daysAgo(3, 1),
    }).returning();

    // Payment 4: ₹500.00 Authorized hold waiting for capture (INR)
    const [p4] = await db.insert(payments).values({
      userId: merchantUser.id,
      amount: "50000",
      currency: "inr",
      status: "authorized",
      processor: "dummy",
      processorPaymentId: `dummy_pi_${uuidv4()}`,
      capturedAmount: "0",
      refundedAmount: "0",
      idempotencyKey: `idem_seed_${uuidv4()}`,
      metadata: { description: "Citizen Service Booking Hold", reference: "CIT-8841" },
      createdAt: daysAgo(2, 3),
    }).returning();

    // Payment 5: ₹250.00 Refunded (INR)
    const [p5] = await db.insert(payments).values({
      userId: merchantUser.id,
      amount: "25000",
      currency: "inr",
      status: "refunded",
      processor: "dummy",
      processorPaymentId: `dummy_ch_${uuidv4()}`,
      capturedAmount: "25000",
      refundedAmount: "25000",
      idempotencyKey: `idem_seed_${uuidv4()}`,
      metadata: { description: "Returned Accessory Item", orderId: "ORD-9902" },
      createdAt: daysAgo(4, 4),
    }).returning();

    // Payment 6: ₹10.99 Failed via .99 rule (INR)
    const [p6] = await db.insert(payments).values({
      userId: merchantUser.id,
      amount: "1099",
      currency: "inr",
      status: "failed",
      processor: "dummy",
      processorPaymentId: `dummy_ch_${uuidv4()}`,
      capturedAmount: "0",
      refundedAmount: "0",
      idempotencyKey: `idem_seed_${uuidv4()}`,
      metadata: { description: "Card Validation Failure Test", note: "Simulated decline via .99" },
      createdAt: daysAgo(1, 6),
    }).returning();

    // Payment 7: $45.00 Succeeded (USD)
    const [p7] = await db.insert(payments).values({
      userId: merchantUser.id,
      amount: "4500",
      currency: "usd",
      status: "succeeded",
      processor: "dummy",
      processorPaymentId: `dummy_ch_${uuidv4()}`,
      capturedAmount: "4500",
      refundedAmount: "0",
      idempotencyKey: `idem_seed_${uuidv4()}`,
      metadata: { description: "International Cloud Credits", tier: "developer" },
      createdAt: daysAgo(1, 1),
    }).returning();

    // Payment 8: $20.99 Failed via .99 rule (USD)
    const [p8] = await db.insert(payments).values({
      userId: merchantUser.id,
      amount: "2099",
      currency: "usd",
      status: "failed",
      processor: "dummy",
      processorPaymentId: `dummy_ch_${uuidv4()}`,
      capturedAmount: "0",
      refundedAmount: "0",
      idempotencyKey: `idem_seed_${uuidv4()}`,
      metadata: { description: "Declined Cross-border Payment", note: "Decline test" },
      createdAt: daysAgo(0, 4),
    }).returning();

    // 6. Seed Refund record for Payment 5
    if (p5) {
      await db.insert(refunds).values({
        userId: merchantUser.id,
        paymentId: p5.id,
        amount: "25000",
        status: "succeeded",
        processorRefundId: `dummy_re_${uuidv4()}`,
        reason: "customer_requested",
        createdAt: daysAgo(4, 2),
      });
    }

    // 7. Seed 3 historical webhook events
    if (p1) {
      await db.insert(webhookEvents).values({
        endpointId: endpoint.id,
        eventType: "payment.succeeded",
        payload: {
          id: `evt_${uuidv4()}`,
          type: "payment.succeeded",
          createdAt: daysAgo(6, 2).toISOString(),
          data: {
            id: p1.id,
            amount: p1.amount,
            currency: p1.currency,
            status: p1.status,
            description: "Enterprise SaaS Annual Plan",
          },
        },
        status: "succeeded",
        attempts: 1,
        lastError: null,
        createdAt: daysAgo(6, 2),
      });
    }

    if (p3) {
      await db.insert(webhookEvents).values({
        endpointId: endpoint.id,
        eventType: "payment.authorized",
        payload: {
          id: `evt_${uuidv4()}`,
          type: "payment.authorized",
          createdAt: daysAgo(3, 1).toISOString(),
          data: {
            id: p3.id,
            amount: p3.amount,
            currency: p3.currency,
            status: p3.status,
            description: "Hardware Deposit Hold",
          },
        },
        status: "succeeded",
        attempts: 1,
        lastError: null,
        createdAt: daysAgo(3, 1),
      });
    }

    if (p5) {
      await db.insert(webhookEvents).values({
        endpointId: endpoint.id,
        eventType: "refund.succeeded",
        payload: {
          id: `evt_${uuidv4()}`,
          type: "refund.succeeded",
          createdAt: daysAgo(4, 2).toISOString(),
          data: {
            paymentId: p5.id,
            amount: "25000",
            currency: "inr",
            status: "succeeded",
          },
        },
        status: "succeeded",
        attempts: 1,
        lastError: null,
        createdAt: daysAgo(4, 2),
      });
    }

    // 8. Seed 8 audit log entries
    const auditEntries = [
      {
        userId: adminUser.id,
        action: "user.tier_updated",
        resourceType: "user",
        resourceId: merchantUser.id,
        metadata: { targetUserId: merchantUser.id, newTier: "paid" },
        createdAt: daysAgo(7),
      },
      {
        userId: merchantUser.id,
        action: "webhook_endpoint.created",
        resourceType: "webhook_endpoint",
        resourceId: endpoint.id,
        metadata: { url: realSandboxUrl, description: "Built-in Evaluator Sandbox Receiver" },
        createdAt: daysAgo(6, 4),
      },
      {
        userId: merchantUser.id,
        action: "payment.created",
        resourceType: "payment",
        resourceId: p1 ? p1.id : uuidv4(),
        metadata: { amount: "150000", currency: "inr", processor: "dummy", status: "succeeded" },
        createdAt: daysAgo(6, 2),
      },
      {
        userId: merchantUser.id,
        action: "payment.created",
        resourceType: "payment",
        resourceId: p2 ? p2.id : uuidv4(),
        metadata: { amount: "49900", currency: "inr", processor: "dummy", status: "succeeded" },
        createdAt: daysAgo(5, 5),
      },
      {
        userId: merchantUser.id,
        action: "payment.created",
        resourceType: "payment",
        resourceId: p3 ? p3.id : uuidv4(),
        metadata: { amount: "125000", currency: "inr", processor: "dummy", status: "authorized" },
        createdAt: daysAgo(3, 1),
      },
      {
        userId: merchantUser.id,
        action: "payment.created",
        resourceType: "payment",
        resourceId: p4 ? p4.id : uuidv4(),
        metadata: { amount: "50000", currency: "inr", processor: "dummy", status: "authorized" },
        createdAt: daysAgo(2, 3),
      },
      {
        userId: merchantUser.id,
        action: "payment.refunded",
        resourceType: "refund",
        resourceId: p5 ? p5.id : uuidv4(),
        metadata: { paymentId: p5 ? p5.id : "", refundAmount: "25000", reason: "customer_requested" },
        createdAt: daysAgo(4, 2),
      },
      {
        userId: merchantUser.id,
        action: "payment.created",
        resourceType: "payment",
        resourceId: p6 ? p6.id : uuidv4(),
        metadata: { amount: "1099", currency: "inr", processor: "dummy", status: "failed" },
        createdAt: daysAgo(1, 6),
      },
    ];

    for (const entry of auditEntries) {
      await db.insert(auditLogs).values({
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata,
        createdAt: entry.createdAt,
      });
    }

    logger.info("Successfully seeded demo data: 2 users, 8 payments, 1 endpoint, 3 webhooks, 8 audit logs.");
    return { seeded: true, message: "Demo data seeded successfully" };
  } catch (err: any) {
    logger.error({ err }, "Error running seedDemoData");
    return { seeded: false, error: err.message };
  }
};
