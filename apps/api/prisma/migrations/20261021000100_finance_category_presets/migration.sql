-- Статьи пресета (TASK-798) клубам и студиям, где финансы уже включены; остальным их создаёт
-- включение модуля (FinanceModuleLifecycle). Снимок categoryPresetsFor из finance-category.ts:
-- доходы своего типа портала, затем общие расходы; порядок — шаг 10.
INSERT INTO "finance_categories" ("id", "portal_id", "code", "direction", "pgc_account", "tax_treatment", "is_preset", "sort_order", "updated_at")
SELECT gen_random_uuid()::text, m."portal_id", c.code, c.direction::"ledger_direction", c.pgc,
       c.treatment::"tax_treatment", true,
       CASE WHEN c.scope = 'any' THEN c.sort + CASE WHEN p."type" = 'club' THEN 40 ELSE 30 END ELSE c.sort END,
       CURRENT_TIMESTAMP
FROM "portal_modules" m
JOIN "portals" p ON p."id" = m."portal_id"
CROSS JOIN (VALUES
    ('club', 'membership_fees', 'income', '720', 'not_subject', 10),
    ('club', 'sales', 'income', '721', NULL, 20),
    ('club', 'donations', 'income', '740', 'not_subject', 30),
    ('club', 'other_income', 'income', '759', NULL, 40),
    ('studio', 'services', 'income', '705', NULL, 10),
    ('studio', 'sales', 'income', '700', NULL, 20),
    ('studio', 'other_income', 'income', '759', NULL, 30),
    ('any', 'purchases', 'expense', '600', NULL, 10),
    ('any', 'supplies', 'expense', '602', NULL, 20),
    ('any', 'rent', 'expense', '621', NULL, 30),
    ('any', 'repairs', 'expense', '622', NULL, 40),
    ('any', 'professional_services', 'expense', '623', NULL, 50),
    ('any', 'insurance', 'expense', '625', 'exempt', 60),
    ('any', 'bank_fees', 'expense', '626', 'exempt', 70),
    ('any', 'marketing', 'expense', '627', NULL, 80),
    ('any', 'utilities', 'expense', '628', NULL, 90),
    ('any', 'taxes', 'expense', '631', 'not_subject', 100),
    ('any', 'salaries', 'expense', '640', 'not_subject', 110),
    ('any', 'social_security', 'expense', '642', 'not_subject', 120),
    ('any', 'other_expenses', 'expense', '629', NULL, 130)
) AS c(scope, code, direction, pgc, treatment, sort)
WHERE m."code" = 'finance'
  AND (c.scope = 'any' OR (c.scope = 'club') = (p."type" = 'club'))
ON CONFLICT ("portal_id", "code") DO NOTHING;
