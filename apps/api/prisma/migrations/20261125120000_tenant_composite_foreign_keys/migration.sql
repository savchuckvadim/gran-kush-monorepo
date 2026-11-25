-- Tenant isolation in the schema (TASK-822): a row can no longer point at a row of another portal.
--
-- 1. Nine child tables that had no portal of their own get `portal_id`, filled from the parent.
-- 2. Portal-scoped parents get the key (id, portal_id); every foreign key between two portal-scoped
--    tables becomes composite: (x_id, portal_id) -> parent(id, portal_id).
--
-- Optional references keep ON DELETE SET NULL, but only for their own column —
-- `SET NULL ("x_id")`: the plain form would also null `portal_id`, which is NOT NULL, and every
-- delete of the parent would fail. Prisma generates the plain form; a new optional composite
-- relation needs the column list written by hand (test/db-constraints.e2e-spec.ts checks it).

-- 1. portal_id in child tables: add nullable, fill from the parent, then require it

ALTER TABLE "status_items" ADD COLUMN "portal_id" TEXT;
ALTER TABLE "field_definitions" ADD COLUMN "portal_id" TEXT;
ALTER TABLE "field_options" ADD COLUMN "portal_id" TEXT;
ALTER TABLE "form_definition_items" ADD COLUMN "portal_id" TEXT;
ALTER TABLE "stages" ADD COLUMN "portal_id" TEXT;
ALTER TABLE "qr_codes" ADD COLUMN "portal_id" TEXT;
ALTER TABLE "presence_sessions" ADD COLUMN "portal_id" TEXT;
ALTER TABLE "product_images" ADD COLUMN "portal_id" TEXT;
ALTER TABLE "order_items" ADD COLUMN "portal_id" TEXT;

UPDATE "status_items" AS c SET "portal_id" = p."portal_id" FROM "status_sets" AS p WHERE p."id" = c."status_set_id";
UPDATE "field_definitions" AS c SET "portal_id" = p."portal_id" FROM "entity_definitions" AS p WHERE p."id" = c."entity_definition_id";
UPDATE "field_options" AS c SET "portal_id" = p."portal_id" FROM "field_definitions" AS p WHERE p."id" = c."field_definition_id";
UPDATE "form_definition_items" AS c SET "portal_id" = p."portal_id" FROM "form_definitions" AS p WHERE p."id" = c."form_definition_id";
UPDATE "stages" AS c SET "portal_id" = p."portal_id" FROM "stage_categories" AS p WHERE p."id" = c."stage_category_id";
UPDATE "qr_codes" AS c SET "portal_id" = p."portal_id" FROM "entity_records" AS p WHERE p."id" = c."entity_record_id";
UPDATE "presence_sessions" AS c SET "portal_id" = p."portal_id" FROM "entity_records" AS p WHERE p."id" = c."entity_record_id";
UPDATE "product_images" AS c SET "portal_id" = p."portal_id" FROM "products" AS p WHERE p."id" = c."product_id";
UPDATE "order_items" AS c SET "portal_id" = p."portal_id" FROM "orders" AS p WHERE p."id" = c."order_id";

ALTER TABLE "status_items" ALTER COLUMN "portal_id" SET NOT NULL;
ALTER TABLE "field_definitions" ALTER COLUMN "portal_id" SET NOT NULL;
ALTER TABLE "field_options" ALTER COLUMN "portal_id" SET NOT NULL;
ALTER TABLE "form_definition_items" ALTER COLUMN "portal_id" SET NOT NULL;
ALTER TABLE "stages" ALTER COLUMN "portal_id" SET NOT NULL;
ALTER TABLE "qr_codes" ALTER COLUMN "portal_id" SET NOT NULL;
ALTER TABLE "presence_sessions" ALTER COLUMN "portal_id" SET NOT NULL;
ALTER TABLE "product_images" ALTER COLUMN "portal_id" SET NOT NULL;
ALTER TABLE "order_items" ALTER COLUMN "portal_id" SET NOT NULL;

-- 2. Stop before touching constraints if any row already references another portal: the full
--    list in one error is easier to act on than the first violated key.
DO $$
DECLARE
    rel record;
    found bigint;
    report text := '';
BEGIN
    FOR rel IN
        SELECT * FROM (VALUES
        ('members', 'entity_record_id', 'entity_records'),
        ('members', 'registration_link_id', 'registration_links'),
        ('members', 'created_by_employee_id', 'employees'),
        ('employees', 'entity_record_id', 'entity_records'),
        ('employees', 'role_id', 'portal_roles'),
        ('employees', 'invitation_id', 'employee_invitations'),
        ('entity_records', 'entity_definition_id', 'entity_definitions'),
        ('entity_records', 'status_item_id', 'status_items'),
        ('entity_records', 'stage_id', 'stages'),
        ('entity_records', 'created_by_employee_id', 'employees'),
        ('status_sets', 'entity_definition_id', 'entity_definitions'),
        ('status_items', 'status_set_id', 'status_sets'),
        ('field_definitions', 'entity_definition_id', 'entity_definitions'),
        ('field_definitions', 'relation_target_entity_definition_id', 'entity_definitions'),
        ('field_options', 'field_definition_id', 'field_definitions'),
        ('form_definitions', 'entity_definition_id', 'entity_definitions'),
        ('form_definition_items', 'form_definition_id', 'form_definitions'),
        ('form_definition_items', 'field_definition_id', 'field_definitions'),
        ('field_values', 'entity_record_id', 'entity_records'),
        ('field_values', 'field_definition_id', 'field_definitions'),
        ('record_relations', 'field_definition_id', 'field_definitions'),
        ('record_relations', 'source_record_id', 'entity_records'),
        ('record_relations', 'target_record_id', 'entity_records'),
        ('stage_categories', 'entity_definition_id', 'entity_definitions'),
        ('stages', 'stage_category_id', 'stage_categories'),
        ('registration_links', 'entity_definition_id', 'entity_definitions'),
        ('registration_links', 'form_definition_id', 'form_definitions'),
        ('registration_links', 'created_by_employee_id', 'employees'),
        ('employee_invitations', 'invited_by_employee_id', 'employees'),
        ('employee_invitations', 'role_id', 'portal_roles'),
        ('ui_settings', 'employee_id', 'employees'),
        ('product_reviews', 'product_id', 'products'),
        ('qr_codes', 'entity_record_id', 'entity_records'),
        ('presence_sessions', 'entity_record_id', 'entity_records'),
        ('presence_sessions', 'employee_id', 'employees'),
        ('product_categories', 'parent_id', 'product_categories'),
        ('products', 'entity_record_id', 'entity_records'),
        ('products', 'category_id', 'product_categories'),
        ('products', 'measurement_unit_id', 'measurement_units'),
        ('products', 'tax_rate_id', 'tax_rates'),
        ('products', 'created_by', 'employees'),
        ('products', 'updated_by', 'employees'),
        ('product_images', 'product_id', 'products'),
        ('orders', 'entity_record_id', 'entity_records'),
        ('orders', 'member_id', 'members'),
        ('orders', 'employee_id', 'employees'),
        ('order_items', 'order_id', 'orders'),
        ('order_items', 'product_id', 'products'),
        ('financial_transactions', 'order_id', 'orders'),
        ('financial_transactions', 'entity_record_id', 'entity_records'),
        ('financial_transactions', 'created_by', 'employees'),
        ('notifications', 'employee_id', 'employees'),
        ('notifications', 'member_id', 'members'),
        ('entity_comments', 'author_employee_id', 'employees'),
        ('entity_comments', 'pinned_by_employee_id', 'employees'),
        ('counterparties', 'member_id', 'members'),
        ('ledger_entries', 'category_id', 'finance_categories'),
        ('ledger_entries', 'counterparty_id', 'counterparties'),
        ('ledger_entries', 'reversal_of_id', 'ledger_entries'),
        ('ledger_entries', 'created_by_id', 'employees'),
        ('ledger_entries', 'voided_by_id', 'employees'),
        ('finance_periods', 'closed_by_id', 'employees'),
        ('stock_moves', 'product_id', 'products'),
        ('stock_moves', 'order_id', 'orders'),
        ('stock_moves', 'purchase_id', 'purchases'),
        ('stock_moves', 'employee_id', 'employees'),
        ('purchases', 'product_id', 'products'),
        ('purchases', 'ledger_entry_id', 'ledger_entries'),
        ('purchases', 'counterparty_id', 'counterparties'),
        ('purchases', 'employee_id', 'employees'),
        ('operations', 'requested_by_employee_id', 'employees')
        ) AS v(child, col, parent)
    LOOP
        EXECUTE format(
            'SELECT count(*) FROM %I c JOIN %I p ON p."id" = c.%I WHERE p."portal_id" <> c."portal_id"',
            rel.child, rel.parent, rel.col
        ) INTO found;
        IF found > 0 THEN
            report := report || format(E'\n  %s.%s -> %s: %s rows', rel.child, rel.col, rel.parent, found);
        END IF;
    END LOOP;

    IF report <> '' THEN
        RAISE EXCEPTION 'TASK-822: rows reference a parent of another portal:%', report;
    END IF;
END $$;

-- 3. Single-column foreign keys give way to composite ones

ALTER TABLE "counterparties" DROP CONSTRAINT "counterparties_member_id_fkey";
ALTER TABLE "employee_invitations" DROP CONSTRAINT "employee_invitations_invited_by_employee_id_fkey";
ALTER TABLE "employee_invitations" DROP CONSTRAINT "employee_invitations_role_id_fkey";
ALTER TABLE "employees" DROP CONSTRAINT "employees_entity_record_id_fkey";
ALTER TABLE "employees" DROP CONSTRAINT "employees_invitation_id_fkey";
ALTER TABLE "employees" DROP CONSTRAINT "employees_role_id_fkey";
ALTER TABLE "entity_comments" DROP CONSTRAINT "entity_comments_author_employee_id_fkey";
ALTER TABLE "entity_comments" DROP CONSTRAINT "entity_comments_pinned_by_employee_id_fkey";
ALTER TABLE "entity_records" DROP CONSTRAINT "entity_records_created_by_employee_id_fkey";
ALTER TABLE "entity_records" DROP CONSTRAINT "entity_records_entity_definition_id_fkey";
ALTER TABLE "entity_records" DROP CONSTRAINT "entity_records_stage_id_fkey";
ALTER TABLE "entity_records" DROP CONSTRAINT "entity_records_status_item_id_fkey";
ALTER TABLE "field_definitions" DROP CONSTRAINT "field_definitions_entity_definition_id_fkey";
ALTER TABLE "field_definitions" DROP CONSTRAINT "field_definitions_relation_target_entity_definition_id_fkey";
ALTER TABLE "field_options" DROP CONSTRAINT "field_options_field_definition_id_fkey";
ALTER TABLE "field_values" DROP CONSTRAINT "field_values_entity_record_id_fkey";
ALTER TABLE "field_values" DROP CONSTRAINT "field_values_field_definition_id_fkey";
ALTER TABLE "finance_periods" DROP CONSTRAINT "finance_periods_closed_by_id_fkey";
ALTER TABLE "financial_transactions" DROP CONSTRAINT "financial_transactions_created_by_fkey";
ALTER TABLE "financial_transactions" DROP CONSTRAINT "financial_transactions_entity_record_id_fkey";
ALTER TABLE "financial_transactions" DROP CONSTRAINT "financial_transactions_order_id_fkey";
ALTER TABLE "form_definition_items" DROP CONSTRAINT "form_definition_items_field_definition_id_fkey";
ALTER TABLE "form_definition_items" DROP CONSTRAINT "form_definition_items_form_definition_id_fkey";
ALTER TABLE "form_definitions" DROP CONSTRAINT "form_definitions_entity_definition_id_fkey";
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_category_id_fkey";
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_counterparty_id_fkey";
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_created_by_id_fkey";
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_reversal_of_id_fkey";
ALTER TABLE "ledger_entries" DROP CONSTRAINT "ledger_entries_voided_by_id_fkey";
ALTER TABLE "members" DROP CONSTRAINT "members_created_by_employee_id_fkey";
ALTER TABLE "members" DROP CONSTRAINT "members_entity_record_id_fkey";
ALTER TABLE "members" DROP CONSTRAINT "members_registration_link_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_employee_id_fkey";
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_member_id_fkey";
ALTER TABLE "operations" DROP CONSTRAINT "operations_requested_by_employee_id_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_order_id_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_product_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT "orders_employee_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT "orders_entity_record_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT "orders_member_id_fkey";
ALTER TABLE "presence_sessions" DROP CONSTRAINT "presence_sessions_employee_id_fkey";
ALTER TABLE "presence_sessions" DROP CONSTRAINT "presence_sessions_entity_record_id_fkey";
ALTER TABLE "product_categories" DROP CONSTRAINT "product_categories_parent_id_fkey";
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_fkey";
ALTER TABLE "product_reviews" DROP CONSTRAINT "product_reviews_product_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT "products_category_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT "products_created_by_fkey";
ALTER TABLE "products" DROP CONSTRAINT "products_entity_record_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT "products_measurement_unit_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT "products_tax_rate_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT "products_updated_by_fkey";
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_counterparty_id_fkey";
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_employee_id_fkey";
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_ledger_entry_id_fkey";
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_product_id_fkey";
ALTER TABLE "qr_codes" DROP CONSTRAINT "qr_codes_entity_record_id_fkey";
ALTER TABLE "record_relations" DROP CONSTRAINT "record_relations_field_definition_id_fkey";
ALTER TABLE "record_relations" DROP CONSTRAINT "record_relations_source_record_id_fkey";
ALTER TABLE "record_relations" DROP CONSTRAINT "record_relations_target_record_id_fkey";
ALTER TABLE "registration_links" DROP CONSTRAINT "registration_links_created_by_employee_id_fkey";
ALTER TABLE "registration_links" DROP CONSTRAINT "registration_links_entity_definition_id_fkey";
ALTER TABLE "registration_links" DROP CONSTRAINT "registration_links_form_definition_id_fkey";
ALTER TABLE "stage_categories" DROP CONSTRAINT "stage_categories_entity_definition_id_fkey";
ALTER TABLE "stages" DROP CONSTRAINT "stages_stage_category_id_fkey";
ALTER TABLE "status_items" DROP CONSTRAINT "status_items_status_set_id_fkey";
ALTER TABLE "status_sets" DROP CONSTRAINT "status_sets_entity_definition_id_fkey";
ALTER TABLE "stock_moves" DROP CONSTRAINT "stock_moves_employee_id_fkey";
ALTER TABLE "stock_moves" DROP CONSTRAINT "stock_moves_order_id_fkey";
ALTER TABLE "stock_moves" DROP CONSTRAINT "stock_moves_product_id_fkey";
ALTER TABLE "stock_moves" DROP CONSTRAINT "stock_moves_purchase_id_fkey";
ALTER TABLE "ui_settings" DROP CONSTRAINT "ui_settings_employee_id_fkey";

-- 4. Keys the composite foreign keys point at, and portal indexes of the child tables

CREATE UNIQUE INDEX "counterparties_id_portal_id_key" ON "counterparties"("id", "portal_id");
CREATE UNIQUE INDEX "employee_invitations_id_portal_id_key" ON "employee_invitations"("id", "portal_id");
CREATE UNIQUE INDEX "employees_entity_record_id_portal_id_key" ON "employees"("entity_record_id", "portal_id");
CREATE UNIQUE INDEX "employees_id_portal_id_key" ON "employees"("id", "portal_id");
CREATE UNIQUE INDEX "entity_definitions_id_portal_id_key" ON "entity_definitions"("id", "portal_id");
CREATE UNIQUE INDEX "entity_records_id_portal_id_key" ON "entity_records"("id", "portal_id");
CREATE INDEX "field_definitions_portal_id_idx" ON "field_definitions"("portal_id");
CREATE UNIQUE INDEX "field_definitions_id_portal_id_key" ON "field_definitions"("id", "portal_id");
CREATE INDEX "field_options_portal_id_idx" ON "field_options"("portal_id");
CREATE UNIQUE INDEX "finance_categories_id_portal_id_key" ON "finance_categories"("id", "portal_id");
CREATE INDEX "form_definition_items_portal_id_idx" ON "form_definition_items"("portal_id");
CREATE UNIQUE INDEX "form_definitions_id_portal_id_key" ON "form_definitions"("id", "portal_id");
CREATE UNIQUE INDEX "ledger_entries_reversal_of_id_portal_id_key" ON "ledger_entries"("reversal_of_id", "portal_id");
CREATE UNIQUE INDEX "ledger_entries_id_portal_id_key" ON "ledger_entries"("id", "portal_id");
CREATE UNIQUE INDEX "measurement_units_id_portal_id_key" ON "measurement_units"("id", "portal_id");
CREATE UNIQUE INDEX "members_entity_record_id_portal_id_key" ON "members"("entity_record_id", "portal_id");
CREATE UNIQUE INDEX "members_id_portal_id_key" ON "members"("id", "portal_id");
CREATE INDEX "order_items_portal_id_idx" ON "order_items"("portal_id");
CREATE UNIQUE INDEX "orders_entity_record_id_portal_id_key" ON "orders"("entity_record_id", "portal_id");
CREATE UNIQUE INDEX "orders_id_portal_id_key" ON "orders"("id", "portal_id");
CREATE UNIQUE INDEX "portal_roles_id_portal_id_key" ON "portal_roles"("id", "portal_id");
CREATE INDEX "presence_sessions_portal_id_idx" ON "presence_sessions"("portal_id");
CREATE UNIQUE INDEX "product_categories_id_portal_id_key" ON "product_categories"("id", "portal_id");
CREATE INDEX "product_images_portal_id_idx" ON "product_images"("portal_id");
CREATE UNIQUE INDEX "products_entity_record_id_portal_id_key" ON "products"("entity_record_id", "portal_id");
CREATE UNIQUE INDEX "products_id_portal_id_key" ON "products"("id", "portal_id");
CREATE UNIQUE INDEX "purchases_ledger_entry_id_portal_id_key" ON "purchases"("ledger_entry_id", "portal_id");
CREATE UNIQUE INDEX "purchases_id_portal_id_key" ON "purchases"("id", "portal_id");
CREATE INDEX "qr_codes_portal_id_idx" ON "qr_codes"("portal_id");
CREATE UNIQUE INDEX "qr_codes_entity_record_id_portal_id_key" ON "qr_codes"("entity_record_id", "portal_id");
CREATE UNIQUE INDEX "registration_links_id_portal_id_key" ON "registration_links"("id", "portal_id");
CREATE UNIQUE INDEX "stage_categories_id_portal_id_key" ON "stage_categories"("id", "portal_id");
CREATE INDEX "stages_portal_id_idx" ON "stages"("portal_id");
CREATE UNIQUE INDEX "stages_id_portal_id_key" ON "stages"("id", "portal_id");
CREATE INDEX "status_items_portal_id_idx" ON "status_items"("portal_id");
CREATE UNIQUE INDEX "status_items_id_portal_id_key" ON "status_items"("id", "portal_id");
CREATE UNIQUE INDEX "status_sets_id_portal_id_key" ON "status_sets"("id", "portal_id");
CREATE UNIQUE INDEX "tax_rates_id_portal_id_key" ON "tax_rates"("id", "portal_id");

-- 5. Composite foreign keys

ALTER TABLE "members" ADD CONSTRAINT "members_entity_record_id_portal_id_fkey" FOREIGN KEY ("entity_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_registration_link_id_portal_id_fkey" FOREIGN KEY ("registration_link_id", "portal_id") REFERENCES "registration_links"("id", "portal_id") ON DELETE SET NULL ("registration_link_id") ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_created_by_employee_id_portal_id_fkey" FOREIGN KEY ("created_by_employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("created_by_employee_id") ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_entity_record_id_portal_id_fkey" FOREIGN KEY ("entity_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_role_id_portal_id_fkey" FOREIGN KEY ("role_id", "portal_id") REFERENCES "portal_roles"("id", "portal_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_invitation_id_portal_id_fkey" FOREIGN KEY ("invitation_id", "portal_id") REFERENCES "employee_invitations"("id", "portal_id") ON DELETE SET NULL ("invitation_id") ON UPDATE CASCADE;
ALTER TABLE "entity_records" ADD CONSTRAINT "entity_records_entity_definition_id_portal_id_fkey" FOREIGN KEY ("entity_definition_id", "portal_id") REFERENCES "entity_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_records" ADD CONSTRAINT "entity_records_status_item_id_portal_id_fkey" FOREIGN KEY ("status_item_id", "portal_id") REFERENCES "status_items"("id", "portal_id") ON DELETE SET NULL ("status_item_id") ON UPDATE CASCADE;
ALTER TABLE "entity_records" ADD CONSTRAINT "entity_records_stage_id_portal_id_fkey" FOREIGN KEY ("stage_id", "portal_id") REFERENCES "stages"("id", "portal_id") ON DELETE SET NULL ("stage_id") ON UPDATE CASCADE;
ALTER TABLE "entity_records" ADD CONSTRAINT "entity_records_created_by_employee_id_portal_id_fkey" FOREIGN KEY ("created_by_employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("created_by_employee_id") ON UPDATE CASCADE;
ALTER TABLE "status_sets" ADD CONSTRAINT "status_sets_entity_definition_id_portal_id_fkey" FOREIGN KEY ("entity_definition_id", "portal_id") REFERENCES "entity_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "status_items" ADD CONSTRAINT "status_items_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "status_items" ADD CONSTRAINT "status_items_status_set_id_portal_id_fkey" FOREIGN KEY ("status_set_id", "portal_id") REFERENCES "status_sets"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_entity_definition_id_portal_id_fkey" FOREIGN KEY ("entity_definition_id", "portal_id") REFERENCES "entity_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_relation_target_entity_definition_id_por_fkey" FOREIGN KEY ("relation_target_entity_definition_id", "portal_id") REFERENCES "entity_definitions"("id", "portal_id") ON DELETE SET NULL ("relation_target_entity_definition_id") ON UPDATE CASCADE;
ALTER TABLE "field_options" ADD CONSTRAINT "field_options_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_options" ADD CONSTRAINT "field_options_field_definition_id_portal_id_fkey" FOREIGN KEY ("field_definition_id", "portal_id") REFERENCES "field_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_entity_definition_id_portal_id_fkey" FOREIGN KEY ("entity_definition_id", "portal_id") REFERENCES "entity_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_definition_items" ADD CONSTRAINT "form_definition_items_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_definition_items" ADD CONSTRAINT "form_definition_items_form_definition_id_portal_id_fkey" FOREIGN KEY ("form_definition_id", "portal_id") REFERENCES "form_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "form_definition_items" ADD CONSTRAINT "form_definition_items_field_definition_id_portal_id_fkey" FOREIGN KEY ("field_definition_id", "portal_id") REFERENCES "field_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_entity_record_id_portal_id_fkey" FOREIGN KEY ("entity_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_field_definition_id_portal_id_fkey" FOREIGN KEY ("field_definition_id", "portal_id") REFERENCES "field_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_field_definition_id_portal_id_fkey" FOREIGN KEY ("field_definition_id", "portal_id") REFERENCES "field_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_source_record_id_portal_id_fkey" FOREIGN KEY ("source_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_target_record_id_portal_id_fkey" FOREIGN KEY ("target_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stage_categories" ADD CONSTRAINT "stage_categories_entity_definition_id_portal_id_fkey" FOREIGN KEY ("entity_definition_id", "portal_id") REFERENCES "entity_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stages" ADD CONSTRAINT "stages_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stages" ADD CONSTRAINT "stages_stage_category_id_portal_id_fkey" FOREIGN KEY ("stage_category_id", "portal_id") REFERENCES "stage_categories"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_links" ADD CONSTRAINT "registration_links_entity_definition_id_portal_id_fkey" FOREIGN KEY ("entity_definition_id", "portal_id") REFERENCES "entity_definitions"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "registration_links" ADD CONSTRAINT "registration_links_form_definition_id_portal_id_fkey" FOREIGN KEY ("form_definition_id", "portal_id") REFERENCES "form_definitions"("id", "portal_id") ON DELETE SET NULL ("form_definition_id") ON UPDATE CASCADE;
ALTER TABLE "registration_links" ADD CONSTRAINT "registration_links_created_by_employee_id_portal_id_fkey" FOREIGN KEY ("created_by_employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("created_by_employee_id") ON UPDATE CASCADE;
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_invited_by_employee_id_portal_id_fkey" FOREIGN KEY ("invited_by_employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("invited_by_employee_id") ON UPDATE CASCADE;
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_role_id_portal_id_fkey" FOREIGN KEY ("role_id", "portal_id") REFERENCES "portal_roles"("id", "portal_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ui_settings" ADD CONSTRAINT "ui_settings_employee_id_portal_id_fkey" FOREIGN KEY ("employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_portal_id_fkey" FOREIGN KEY ("product_id", "portal_id") REFERENCES "products"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_entity_record_id_portal_id_fkey" FOREIGN KEY ("entity_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "presence_sessions" ADD CONSTRAINT "presence_sessions_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "presence_sessions" ADD CONSTRAINT "presence_sessions_entity_record_id_portal_id_fkey" FOREIGN KEY ("entity_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "presence_sessions" ADD CONSTRAINT "presence_sessions_employee_id_portal_id_fkey" FOREIGN KEY ("employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("employee_id") ON UPDATE CASCADE;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_portal_id_fkey" FOREIGN KEY ("parent_id", "portal_id") REFERENCES "product_categories"("id", "portal_id") ON DELETE SET NULL ("parent_id") ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_entity_record_id_portal_id_fkey" FOREIGN KEY ("entity_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_portal_id_fkey" FOREIGN KEY ("category_id", "portal_id") REFERENCES "product_categories"("id", "portal_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_measurement_unit_id_portal_id_fkey" FOREIGN KEY ("measurement_unit_id", "portal_id") REFERENCES "measurement_units"("id", "portal_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_tax_rate_id_portal_id_fkey" FOREIGN KEY ("tax_rate_id", "portal_id") REFERENCES "tax_rates"("id", "portal_id") ON DELETE SET NULL ("tax_rate_id") ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_portal_id_fkey" FOREIGN KEY ("created_by", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("created_by") ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_portal_id_fkey" FOREIGN KEY ("updated_by", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("updated_by") ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_portal_id_fkey" FOREIGN KEY ("product_id", "portal_id") REFERENCES "products"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_entity_record_id_portal_id_fkey" FOREIGN KEY ("entity_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_member_id_portal_id_fkey" FOREIGN KEY ("member_id", "portal_id") REFERENCES "members"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_employee_id_portal_id_fkey" FOREIGN KEY ("employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("employee_id") ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_portal_id_fkey" FOREIGN KEY ("order_id", "portal_id") REFERENCES "orders"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_portal_id_fkey" FOREIGN KEY ("product_id", "portal_id") REFERENCES "products"("id", "portal_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_order_id_portal_id_fkey" FOREIGN KEY ("order_id", "portal_id") REFERENCES "orders"("id", "portal_id") ON DELETE SET NULL ("order_id") ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_entity_record_id_portal_id_fkey" FOREIGN KEY ("entity_record_id", "portal_id") REFERENCES "entity_records"("id", "portal_id") ON DELETE SET NULL ("entity_record_id") ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_created_by_portal_id_fkey" FOREIGN KEY ("created_by", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("created_by") ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_employee_id_portal_id_fkey" FOREIGN KEY ("employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_portal_id_fkey" FOREIGN KEY ("member_id", "portal_id") REFERENCES "members"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_comments" ADD CONSTRAINT "entity_comments_author_employee_id_portal_id_fkey" FOREIGN KEY ("author_employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("author_employee_id") ON UPDATE CASCADE;
ALTER TABLE "entity_comments" ADD CONSTRAINT "entity_comments_pinned_by_employee_id_portal_id_fkey" FOREIGN KEY ("pinned_by_employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("pinned_by_employee_id") ON UPDATE CASCADE;
ALTER TABLE "counterparties" ADD CONSTRAINT "counterparties_member_id_portal_id_fkey" FOREIGN KEY ("member_id", "portal_id") REFERENCES "members"("id", "portal_id") ON DELETE SET NULL ("member_id") ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_category_id_portal_id_fkey" FOREIGN KEY ("category_id", "portal_id") REFERENCES "finance_categories"("id", "portal_id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_counterparty_id_portal_id_fkey" FOREIGN KEY ("counterparty_id", "portal_id") REFERENCES "counterparties"("id", "portal_id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reversal_of_id_portal_id_fkey" FOREIGN KEY ("reversal_of_id", "portal_id") REFERENCES "ledger_entries"("id", "portal_id") ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_id_portal_id_fkey" FOREIGN KEY ("created_by_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("created_by_id") ON UPDATE CASCADE;
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_voided_by_id_portal_id_fkey" FOREIGN KEY ("voided_by_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("voided_by_id") ON UPDATE CASCADE;
ALTER TABLE "finance_periods" ADD CONSTRAINT "finance_periods_closed_by_id_portal_id_fkey" FOREIGN KEY ("closed_by_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("closed_by_id") ON UPDATE CASCADE;
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_product_id_portal_id_fkey" FOREIGN KEY ("product_id", "portal_id") REFERENCES "products"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_order_id_portal_id_fkey" FOREIGN KEY ("order_id", "portal_id") REFERENCES "orders"("id", "portal_id") ON DELETE SET NULL ("order_id") ON UPDATE CASCADE;
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_purchase_id_portal_id_fkey" FOREIGN KEY ("purchase_id", "portal_id") REFERENCES "purchases"("id", "portal_id") ON DELETE SET NULL ("purchase_id") ON UPDATE CASCADE;
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_employee_id_portal_id_fkey" FOREIGN KEY ("employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("employee_id") ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_portal_id_fkey" FOREIGN KEY ("product_id", "portal_id") REFERENCES "products"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_ledger_entry_id_portal_id_fkey" FOREIGN KEY ("ledger_entry_id", "portal_id") REFERENCES "ledger_entries"("id", "portal_id") ON DELETE SET NULL ("ledger_entry_id") ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_counterparty_id_portal_id_fkey" FOREIGN KEY ("counterparty_id", "portal_id") REFERENCES "counterparties"("id", "portal_id") ON DELETE SET NULL ("counterparty_id") ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_employee_id_portal_id_fkey" FOREIGN KEY ("employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE SET NULL ("employee_id") ON UPDATE CASCADE;
ALTER TABLE "operations" ADD CONSTRAINT "operations_requested_by_employee_id_portal_id_fkey" FOREIGN KEY ("requested_by_employee_id", "portal_id") REFERENCES "employees"("id", "portal_id") ON DELETE CASCADE ON UPDATE CASCADE;
