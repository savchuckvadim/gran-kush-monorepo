import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import cookieParser from "cookie-parser";
import Stripe from "stripe";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";
import {
    BillingProvider,
    ProviderSubscription,
} from "../src/modules/billing/domain/billing-provider.interface";
import { StripeBillingProvider } from "../src/modules/billing/infrastructure/stripe/stripe-billing.provider";
import { BillingCronService } from "../src/modules/cron/services/billing-cron.service";
import { MailService } from "../src/modules/mail/application/services/mail.service";

jest.setTimeout(120_000);

const suffix = Date.now().toString(36);
const PASSWORD = "Password123";
const WEBHOOK_SECRET = "whsec_e2e_billing";
const DAY_MS = 24 * 60 * 60 * 1000;

const cookieHeader = (res: request.Response): string => {
    const raw = res.headers["set-cookie"];
    const cookies: string[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return cookies.map((c) => c.split(";")[0]).join("; ");
};

/**
 * Stripe без сети: события разбирает настоящий адаптер, а обращения к API Stripe
 * (подписка, checkout, кабинет) отвечают тем, что задал тест.
 */
class FakeStripeProvider extends StripeBillingProvider {
    subscription: ProviderSubscription | null = null;
    readonly checkouts: unknown[] = [];

    constructor() {
        super(null);
    }

    override isConfigured(): boolean {
        return true;
    }

    override async retrieveSubscription(): Promise<ProviderSubscription> {
        if (!this.subscription) throw new Error("No fake subscription");
        return this.subscription;
    }

    override async createCheckout(request: unknown): Promise<{ url: string }> {
        this.checkouts.push(request);
        return { url: "https://checkout.stripe.test/session" };
    }

    override async createManagementSession(): Promise<{ url: string }> {
        return { url: "https://billing.stripe.test/session" };
    }
}

/**
 * Оплата подписки клуба: CRM → Stripe Checkout → вебхуки → статус → гард 402 → крон.
 */
describe("Billing: Stripe subscription flow (e2e)", () => {
    let app: INestApplication;
    let prisma: PrismaService;
    const stripe = new FakeStripeProvider();
    const signer = new Stripe("sk_test_signer_only");

    const slug = `billing-${suffix}`;
    const email = `owner-${slug}@test.local`;
    const planCode = `e2e-prueba-${suffix}`;
    const priceId = `price_e2e${suffix}`;
    let portalId = "";
    let cookies = "";

    const webhook = (event: Record<string, unknown>, secret = WEBHOOK_SECRET) => {
        const payload = JSON.stringify({ object: "event", ...event });
        return request(app.getHttpServer())
            .post("/platform/billing/webhooks/stripe")
            .set("Content-Type", "application/json")
            .set("Stripe-Signature", signer.webhooks.generateTestHeaderString({ payload, secret }))
            .send(payload);
    };
    const crm = (method: "get" | "post", path: string) =>
        request(app.getHttpServer())
            [method](path)
            .set("Cookie", cookies)
            .set("X-Portal-Slug", slug);
    const subscription = () => prisma.portalSubscription.findUniqueOrThrow({ where: { portalId } });
    const activeRemote = (status = "active"): ProviderSubscription => ({
        id: "sub_e2e",
        customerId: "cus_e2e",
        status,
        priceId,
        currentPeriodStart: new Date("2026-10-11T00:00:00Z"),
        currentPeriodEnd: new Date("2026-11-11T00:00:00Z"),
        cancelAtPeriodEnd: false,
        portalId,
    });

    beforeAll(async () => {
        process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(BillingProvider)
            .useValue(stripe)
            .overrideProvider(MailService)
            .useValue({
                sendEmployeeEmailVerification: jest.fn(),
                sendMamberEmailVerification: jest.fn(),
                sendPasswordReset: jest.fn(),
                sendPortalRegistrationEmail: jest.fn(),
                sendEmail: jest.fn(),
            })
            .compile();

        // Как в main.ts: тело разбирают парсеры AppModule, и вебхук получает сырые байты
        app = moduleFixture.createNestApplication({ bodyParser: false });
        app.use(cookieParser());
        await app.init();
        prisma = app.get(PrismaService);

        await prisma.billingPlan.create({
            data: {
                code: planCode,
                name: "Prueba",
                priceAmount: 5,
                featuresJson: {},
                isPublic: false,
                stripePriceId: priceId,
            },
        });

        const res = await request(app.getHttpServer())
            .post("/platform/portals/register")
            .send({
                name: slug,
                displayName: `Billing ${suffix}`,
                email,
                password: PASSWORD,
                ownerName: "Owner",
            });
        expect(res.status).toBe(201);
        cookies = cookieHeader(res);
        portalId = res.body.portal.id;
    });

    afterAll(async () => {
        await prisma.payment.deleteMany({ where: { portalId } });
        await prisma.portal.deleteMany({ where: { name: slug } });
        await prisma.user.deleteMany({ where: { email } });
        await prisma.billingPlan.deleteMany({ where: { code: planCode } });
        await prisma.paymentEvent.deleteMany({
            where: { eventId: { startsWith: `evt_${suffix}` } },
        });
        await app.close();
    });

    it("a new club starts with a free year", async () => {
        const sub = await subscription();
        expect(sub.status).toBe("trialing");
        const days = Math.round(((sub.trialEndsAt?.getTime() ?? 0) - Date.now()) / DAY_MS);
        expect(days).toBe(365);
    });

    it("hidden plans are offered only by a direct link", async () => {
        const plain = await crm("get", "/crm/billing");
        expect(plain.status).toBe(200);
        expect(plain.body.paymentsEnabled).toBe(true);
        expect(plain.body.plans.map((p: { code: string }) => p.code)).not.toContain(planCode);

        const linked = await crm("get", `/crm/billing?plan=${planCode}`);
        expect(linked.body.plans).toContainEqual(
            expect.objectContaining({ code: planCode, priceAmount: "5.00", purchasable: true })
        );
    });

    it("the public catalog does not list hidden plans", async () => {
        const res = await request(app.getHttpServer()).get("/platform/billing/plans");
        const codes = res.body.plans.map((p: { code: string }) => p.code);
        expect(codes).not.toContain(planCode);
        expect(codes).not.toContain("trial");
    });

    it("checkout returns the Stripe page and comes back to the CRM billing page", async () => {
        const res = await crm("post", "/crm/billing/checkout").send({ planCode, locale: "es" });
        expect(res.status).toBe(200);
        expect(res.body.url).toBe("https://checkout.stripe.test/session");
        expect(stripe.checkouts.at(-1)).toEqual(
            expect.objectContaining({
                portalId,
                priceId,
                customerId: null,
                customerEmail: email,
                successUrl: expect.stringMatching(
                    new RegExp(`/es/${slug}/crm/settings/billing\\?checkout=success$`)
                ),
            })
        );
    });

    it("rejects a webhook without a valid signature", async () => {
        const unsigned = await request(app.getHttpServer())
            .post("/platform/billing/webhooks/stripe")
            .set("Content-Type", "application/json")
            .send(JSON.stringify({ id: `evt_${suffix}_x`, type: "invoice.paid" }));
        expect(unsigned.status).toBe(401);

        const forged = await webhook(
            { id: `evt_${suffix}_forged`, type: "invoice.paid", data: { object: {} } },
            "whsec_wrong"
        );
        expect(forged.status).toBe(401);
    });

    it("checkout.session.completed activates the subscription on the paid plan", async () => {
        stripe.subscription = activeRemote();
        const event = {
            id: `evt_${suffix}_checkout`,
            type: "checkout.session.completed",
            data: {
                object: {
                    object: "checkout.session",
                    mode: "subscription",
                    client_reference_id: portalId,
                    metadata: { portalId },
                    customer: "cus_e2e",
                    subscription: "sub_e2e",
                },
            },
        };
        const res = await webhook(event);
        expect(res.status).toBe(200);
        expect(res.body.outcome).toBe("processed");

        const sub = await subscription();
        const plan = await prisma.billingPlan.findUniqueOrThrow({ where: { code: planCode } });
        expect(sub).toEqual(
            expect.objectContaining({
                status: "active",
                planId: plan.id,
                provider: "stripe",
                providerCustomerId: "cus_e2e",
                providerSubscriptionId: "sub_e2e",
                currentPeriodEnd: new Date("2026-11-11T00:00:00Z"),
            })
        );

        const again = await webhook(event);
        expect(again.body.outcome).toBe("duplicate");
    });

    it("invoice.paid records the payment once", async () => {
        const event = {
            id: `evt_${suffix}_invoice`,
            type: "invoice.paid",
            data: {
                object: {
                    object: "invoice",
                    id: `in_${suffix}`,
                    customer: "cus_e2e",
                    amount_paid: 500,
                    currency: "eur",
                    status_transitions: { paid_at: 1791676800 },
                    parent: {
                        subscription_details: { subscription: "sub_e2e", metadata: { portalId } },
                    },
                    lines: {
                        data: [{ period: { start: 1791676800, end: 1794355200 } }],
                    },
                },
            },
        };
        expect((await webhook(event)).status).toBe(200);
        // Повтор доставки с другим id события: платёж всё равно один — якорь в id счёта
        expect((await webhook({ ...event, id: `evt_${suffix}_invoice_retry` })).status).toBe(200);

        const payments = await prisma.payment.findMany({ where: { portalId } });
        expect(payments).toHaveLength(1);
        expect(payments[0]).toEqual(
            expect.objectContaining({ provider: "stripe", status: "succeeded", currency: "EUR" })
        );
        expect(payments[0].amount.toFixed(2)).toBe("5.00");
    });

    it("a second checkout is refused while Stripe already bills the club", async () => {
        const res = await crm("post", "/crm/billing/checkout").send({ planCode });
        expect(res.status).toBe(409);

        const manage = await crm("post", "/crm/billing/manage").send({ locale: "es" });
        expect(manage.status).toBe(200);
        expect(manage.body.url).toBe("https://billing.stripe.test/session");
    });

    it("a failed renewal gives a grace period, then the CRM answers 402 but billing stays open", async () => {
        stripe.subscription = activeRemote("past_due");
        const res = await webhook({
            id: `evt_${suffix}_past_due`,
            type: "customer.subscription.updated",
            data: { object: { object: "subscription", id: "sub_e2e", metadata: { portalId } } },
        });
        expect(res.status).toBe(200);

        const sub = await subscription();
        expect(sub.status).toBe("past_due");
        const graceDays = Math.round(((sub.graceEndsAt?.getTime() ?? 0) - Date.now()) / DAY_MS);
        expect(graceDays).toBe(7);

        const inGrace = await crm("get", "/crm/members");
        expect(inGrace.status).toBe(200);
        expect(inGrace.headers["x-subscription-warning"]).toBe("past_due");

        await prisma.portalSubscription.update({
            where: { portalId },
            data: { graceEndsAt: new Date(Date.now() - 60_000) },
        });
        await app.get(BillingCronService).enforceSubscriptions();
        expect((await subscription()).status).toBe("expired");

        expect((await crm("get", "/crm/members")).status).toBe(402);
        // Страница оплаты открыта именно тогда, когда CRM закрыта
        expect((await crm("get", "/crm/billing")).status).toBe(200);
        // Портал не гасится: клиент может войти и оплатить (TASK-512)
        const portal = await prisma.portal.findUniqueOrThrow({ where: { id: portalId } });
        expect(portal.status).toBe("active");
    });

    it("the cron moves an ended free period to past_due", async () => {
        await prisma.portalSubscription.update({
            where: { portalId },
            data: {
                status: "trialing",
                trialEndsAt: new Date(Date.now() - 60_000),
                graceEndsAt: null,
                provider: null,
                providerSubscriptionId: null,
            },
        });
        await app.get(BillingCronService).enforceSubscriptions();

        const sub = await subscription();
        expect(sub.status).toBe("past_due");
        expect(sub.graceEndsAt?.getTime()).toBeGreaterThan(Date.now());
    });

    it("a club without a subscription gets 402, not free access", async () => {
        await prisma.portalSubscription.delete({ where: { portalId } });
        expect((await crm("get", "/crm/members")).status).toBe(402);
    });

    it("the admin billing API needs a platform session", async () => {
        const res = await request(app.getHttpServer()).get("/platform/admin/billing/plans");
        expect(res.status).toBe(401);
    });
});
