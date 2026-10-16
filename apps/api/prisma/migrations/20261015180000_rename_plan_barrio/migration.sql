-- The entry plan Calada is now Barrio (the site renames it in the same release): its codes appear in
-- the sign-up link ?plan=<code> from the site. Subscriptions refer to plans by id and Stripe metadata
-- carries only the portal id, so nothing else changes. Without these plans the update does nothing.
UPDATE "billing_plans" SET "code" = 'barrio-month', "name" = replace("name", 'Calada', 'Barrio'), "updated_at" = CURRENT_TIMESTAMP WHERE "code" = 'calada-month';
UPDATE "billing_plans" SET "code" = 'barrio-year', "name" = replace("name", 'Calada', 'Barrio'), "updated_at" = CURRENT_TIMESTAMP WHERE "code" = 'calada-year';
