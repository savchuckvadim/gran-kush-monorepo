-- AlterTable
ALTER TABLE "billing_plans" ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stripe_price_id" VARCHAR(255);

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "period_end" TIMESTAMP(3),
ADD COLUMN     "period_start" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "portal_subscriptions" ADD COLUMN     "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "provider" VARCHAR(50),
ADD COLUMN     "provider_customer_id" VARCHAR(255),
ADD COLUMN     "provider_subscription_id" VARCHAR(255),
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "billing_plans_stripe_price_id_key" ON "billing_plans"("stripe_price_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_subscriptions_provider_subscription_id_key" ON "portal_subscriptions"("provider_subscription_id");

-- Data: the free plan is not for sale, the product site must not list it
UPDATE "billing_plans" SET "is_public" = false WHERE "code" = 'trial';

-- Data: clubs already on the free period get the default free year (BILLING_TRIAL_DAYS = 365)
UPDATE "portal_subscriptions"
SET "trial_ends_at" = CURRENT_TIMESTAMP + INTERVAL '365 days'
WHERE "status" = 'trialing' AND "trial_ends_at" IS NULL;

-- Data: the subscription guard now answers 402 to a portal without a subscription,
-- so clubs created before billing get the free year as well
INSERT INTO "billing_plans" ("id", "code", "name", "price_amount", "currency", "interval", "features_json", "is_active", "is_public", "created_at", "updated_at")
SELECT gen_random_uuid()::text, 'trial', 'Trial', 0, 'EUR', 'month', '{"crm": true, "sites": true, "messenger": false}'::jsonb, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "billing_plans" WHERE "code" = 'trial')
  AND EXISTS (
      SELECT 1 FROM "portals" p
      WHERE NOT EXISTS (SELECT 1 FROM "portal_subscriptions" s WHERE s."portal_id" = p."id")
  );

INSERT INTO "portal_subscriptions" ("id", "portal_id", "plan_id", "status", "trial_ends_at", "created_at", "updated_at")
SELECT gen_random_uuid()::text, p."id", (SELECT "id" FROM "billing_plans" WHERE "code" = 'trial'), 'trialing', CURRENT_TIMESTAMP + INTERVAL '365 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "portals" p
WHERE NOT EXISTS (SELECT 1 FROM "portal_subscriptions" s WHERE s."portal_id" = p."id");
