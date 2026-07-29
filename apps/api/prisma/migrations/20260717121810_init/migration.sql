-- CreateEnum
CREATE TYPE "PortalStatus" AS ENUM ('active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "PortalTypeEnum" AS ENUM ('club', 'tattoo_studio', 'beauty_studio');

-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('active', 'pending_claim', 'blocked');

-- CreateEnum
CREATE TYPE "PrincipalType" AS ENUM ('member', 'employee', 'platform_admin');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('portal_owner', 'admin', 'manager', 'employee');

-- CreateEnum
CREATE TYPE "MemberJoinSource" AS ENUM ('self', 'registration_link', 'kiosk', 'crm');

-- CreateEnum
CREATE TYPE "UserDocumentSide" AS ENUM ('front', 'back', 'single');

-- CreateEnum
CREATE TYPE "PortalFieldType" AS ENUM ('string', 'text', 'int', 'decimal', 'boolean', 'date', 'datetime', 'single_select', 'multi_select', 'email', 'phone', 'url', 'file', 'signature', 'document', 'relation');

-- CreateEnum
CREATE TYPE "FormPurpose" AS ENUM ('public_registration', 'crm_create', 'crm_detail', 'member_cabinet');

-- CreateEnum
CREATE TYPE "StageSemantic" AS ENUM ('NEW', 'IN_PROGRESS', 'SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "RegistrationLinkKind" AS ENUM ('public_link', 'kiosk');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- CreateTable
CREATE TABLE "portals" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "status" "PortalStatus" NOT NULL DEFAULT 'active',
    "type" "PortalTypeEnum" NOT NULL DEFAULT 'club',
    "public_description" TEXT,
    "cover_image_url" VARCHAR(500),
    "address" VARCHAR(500),
    "city" VARCHAR(120),
    "country" VARCHAR(120),
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_listed_on_map" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "status" "UserAccountStatus" NOT NULL DEFAULT 'active',
    "display_name" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "email_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "email_verification_token" VARCHAR(255),
    "email_verification_expires_at" TIMESTAMP(3),
    "reset_password_token" VARCHAR(255),
    "reset_password_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "side" "UserDocumentSide" NOT NULL DEFAULT 'single',
    "number" VARCHAR(100),
    "meta" JSONB,
    "storage_path" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_signatures" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'superadmin',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "principal_type" "PrincipalType" NOT NULL,
    "user_id" TEXT,
    "platform_admin_id" TEXT,
    "device_id" VARCHAR(128) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_record_id" TEXT NOT NULL,
    "membership_number" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "join_source" "MemberJoinSource" NOT NULL DEFAULT 'self',
    "registration_link_id" TEXT,
    "created_by_employee_id" TEXT,
    "claimed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_record_id" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL DEFAULT 'employee',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invitation_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_plans" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "price_amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "interval" VARCHAR(20) NOT NULL DEFAULT 'month',
    "features_json" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_subscriptions" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "grace_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "provider" VARCHAR(50),
    "external_id" VARCHAR(255),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_entity_templates" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "applicable_portal_types" JSONB,
    "modules_json" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_entity_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_field_templates" (
    "id" TEXT NOT NULL,
    "global_entity_template_id" TEXT NOT NULL,
    "field_key" VARCHAR(120) NOT NULL,
    "type" "PortalFieldType" NOT NULL,
    "label" VARCHAR(255),
    "label_i18n" JSONB,
    "help_text" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_immutable" BOOLEAN NOT NULL DEFAULT false,
    "deletable_by_portal" BOOLEAN NOT NULL DEFAULT true,
    "customizable_by_portal" BOOLEAN NOT NULL DEFAULT true,
    "document_type" VARCHAR(50),
    "default_value_json" JSONB,
    "validation_json" JSONB,
    "is_multiple" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "show_in_filters" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_field_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_field_option_templates" (
    "id" TEXT NOT NULL,
    "global_field_template_id" TEXT NOT NULL,
    "value_key" VARCHAR(120) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_field_option_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_status_set_templates" (
    "id" TEXT NOT NULL,
    "global_entity_template_id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_immutable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_status_set_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_status_item_templates" (
    "id" TEXT NOT NULL,
    "global_status_set_template_id" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "label_i18n" JSONB,
    "color" VARCHAR(32),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "semantic" VARCHAR(32),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_status_item_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_stage_category_templates" (
    "id" TEXT NOT NULL,
    "global_entity_template_id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "hidden_in_ui" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_stage_category_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_stage_templates" (
    "id" TEXT NOT NULL,
    "global_stage_category_template_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(32),
    "semantic" "StageSemantic" NOT NULL,
    "is_terminal_success" BOOLEAN NOT NULL DEFAULT false,
    "is_terminal_failure" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_stage_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_definitions" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "icon" VARCHAR(80),
    "color" VARCHAR(32),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "applicable_portal_types" JSONB,
    "global_template_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_records" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_definition_id" TEXT NOT NULL,
    "status_item_id" TEXT,
    "stage_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_sets" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_definition_id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_immutable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "status_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_items" (
    "id" TEXT NOT NULL,
    "status_set_id" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "label_i18n" JSONB,
    "color" VARCHAR(32),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "semantic" VARCHAR(32),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "status_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_definitions" (
    "id" TEXT NOT NULL,
    "entity_definition_id" TEXT NOT NULL,
    "field_key" VARCHAR(120) NOT NULL,
    "type" "PortalFieldType" NOT NULL,
    "label" VARCHAR(255),
    "label_i18n" JSONB,
    "help_text" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_immutable" BOOLEAN NOT NULL DEFAULT false,
    "deletable_by_portal" BOOLEAN NOT NULL DEFAULT true,
    "customizable_by_portal" BOOLEAN NOT NULL DEFAULT true,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "label_override" VARCHAR(255),
    "read_only_override" BOOLEAN NOT NULL DEFAULT false,
    "document_type" VARCHAR(50),
    "relation_target_entity_definition_id" TEXT,
    "default_value_json" JSONB,
    "validation_json" JSONB,
    "is_multiple" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "show_in_filters" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_options" (
    "id" TEXT NOT NULL,
    "field_definition_id" TEXT NOT NULL,
    "value_key" VARCHAR(120) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_definitions" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_definition_id" TEXT NOT NULL,
    "purpose" "FormPurpose" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_definition_items" (
    "id" TEXT NOT NULL,
    "form_definition_id" TEXT NOT NULL,
    "field_definition_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "read_only" BOOLEAN NOT NULL DEFAULT false,
    "section_code" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_definition_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_values" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_record_id" TEXT NOT NULL,
    "field_definition_id" TEXT NOT NULL,
    "value_index" INTEGER NOT NULL DEFAULT 0,
    "value_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "record_relations" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "field_definition_id" TEXT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "target_record_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "record_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_categories" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_definition_id" TEXT NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "hidden_in_ui" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" TEXT NOT NULL,
    "stage_category_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "color" VARCHAR(32),
    "semantic" "StageSemantic" NOT NULL,
    "is_terminal_success" BOOLEAN NOT NULL DEFAULT false,
    "is_terminal_failure" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_links" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_definition_id" TEXT NOT NULL,
    "form_definition_id" TEXT,
    "token" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "kind" "RegistrationLinkKind" NOT NULL DEFAULT 'public_link',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "max_uses" INTEGER,
    "uses_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_invitations" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "EmployeeRole" NOT NULL DEFAULT 'employee',
    "token" VARCHAR(64) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "invited_by_employee_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "accepted_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_reviews" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_files" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "portal_id" TEXT,
    "original_name" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_type" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "entity_record_id" TEXT NOT NULL,
    "encrypted_code" VARCHAR(1000) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presence_sessions" (
    "id" TEXT NOT NULL,
    "entity_record_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exited_at" TIMESTAMP(3),
    "entry_method" VARCHAR(50) NOT NULL,
    "exit_method" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presence_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_units" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "measurement_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_record_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "measurement_unit_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sku" VARCHAR(100),
    "price" DECIMAL(10,2) NOT NULL,
    "initial_quantity" DECIMAL(10,3) NOT NULL,
    "current_quantity" DECIMAL(10,3) NOT NULL,
    "min_quantity" DECIMAL(10,3),
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "thc" DECIMAL(5,2),
    "cbd" DECIMAL(5,2),
    "strain" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "entity_record_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "order_number" VARCHAR(50) NOT NULL,
    "payment_status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "prepared_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total_price" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "order_id" TEXT,
    "entity_record_id" TEXT,
    "type" VARCHAR(50) NOT NULL,
    "direction" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "payment_method" VARCHAR(50),
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "description" TEXT,
    "notes" TEXT,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portals_name_key" ON "portals"("name");

-- CreateIndex
CREATE INDEX "portals_name_idx" ON "portals"("name");

-- CreateIndex
CREATE INDEX "portals_status_idx" ON "portals"("status");

-- CreateIndex
CREATE INDEX "portals_is_listed_on_map_idx" ON "portals"("is_listed_on_map");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verification_token_key" ON "users"("email_verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "users_reset_password_token_key" ON "users"("reset_password_token");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "user_documents_user_id_idx" ON "user_documents"("user_id");

-- CreateIndex
CREATE INDEX "user_documents_type_idx" ON "user_documents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "user_documents_user_id_type_side_key" ON "user_documents"("user_id", "type", "side");

-- CreateIndex
CREATE UNIQUE INDEX "user_signatures_user_id_key" ON "user_signatures"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_user_id_key" ON "platform_admins"("user_id");

-- CreateIndex
CREATE INDEX "platform_admins_user_id_idx" ON "platform_admins"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_platform_admin_id_idx" ON "refresh_tokens"("platform_admin_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_principal_type_user_id_device_id_key" ON "refresh_tokens"("principal_type", "user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_principal_type_platform_admin_id_device_id_key" ON "refresh_tokens"("principal_type", "platform_admin_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_entity_record_id_key" ON "members"("entity_record_id");

-- CreateIndex
CREATE INDEX "members_portal_id_idx" ON "members"("portal_id");

-- CreateIndex
CREATE INDEX "members_user_id_idx" ON "members"("user_id");

-- CreateIndex
CREATE INDEX "members_is_active_idx" ON "members"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_portal_id_key" ON "members"("user_id", "portal_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_portal_id_membership_number_key" ON "members"("portal_id", "membership_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_entity_record_id_key" ON "employees"("entity_record_id");

-- CreateIndex
CREATE INDEX "employees_portal_id_idx" ON "employees"("portal_id");

-- CreateIndex
CREATE INDEX "employees_user_id_idx" ON "employees"("user_id");

-- CreateIndex
CREATE INDEX "employees_role_idx" ON "employees"("role");

-- CreateIndex
CREATE INDEX "employees_is_active_idx" ON "employees"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_portal_id_key" ON "employees"("user_id", "portal_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_plans_code_key" ON "billing_plans"("code");

-- CreateIndex
CREATE INDEX "billing_plans_code_idx" ON "billing_plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "portal_subscriptions_portal_id_key" ON "portal_subscriptions"("portal_id");

-- CreateIndex
CREATE INDEX "portal_subscriptions_plan_id_idx" ON "portal_subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "portal_subscriptions_status_idx" ON "portal_subscriptions"("status");

-- CreateIndex
CREATE INDEX "payments_portal_id_idx" ON "payments"("portal_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "global_entity_templates_code_key" ON "global_entity_templates"("code");

-- CreateIndex
CREATE INDEX "global_field_templates_global_entity_template_id_idx" ON "global_field_templates"("global_entity_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_field_templates_global_entity_template_id_field_key_key" ON "global_field_templates"("global_entity_template_id", "field_key");

-- CreateIndex
CREATE INDEX "global_field_option_templates_global_field_template_id_idx" ON "global_field_option_templates"("global_field_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_field_option_templates_global_field_template_id_valu_key" ON "global_field_option_templates"("global_field_template_id", "value_key");

-- CreateIndex
CREATE INDEX "global_status_set_templates_global_entity_template_id_idx" ON "global_status_set_templates"("global_entity_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_status_set_templates_global_entity_template_id_code_key" ON "global_status_set_templates"("global_entity_template_id", "code");

-- CreateIndex
CREATE INDEX "global_status_item_templates_global_status_set_template_id_idx" ON "global_status_item_templates"("global_status_set_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_status_item_templates_global_status_set_template_id__key" ON "global_status_item_templates"("global_status_set_template_id", "key");

-- CreateIndex
CREATE INDEX "global_stage_category_templates_global_entity_template_id_idx" ON "global_stage_category_templates"("global_entity_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_stage_category_templates_global_entity_template_id_c_key" ON "global_stage_category_templates"("global_entity_template_id", "code");

-- CreateIndex
CREATE INDEX "global_stage_templates_global_stage_category_template_id_idx" ON "global_stage_templates"("global_stage_category_template_id");

-- CreateIndex
CREATE INDEX "entity_definitions_portal_id_idx" ON "entity_definitions"("portal_id");

-- CreateIndex
CREATE INDEX "entity_definitions_global_template_id_idx" ON "entity_definitions"("global_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_definitions_portal_id_code_key" ON "entity_definitions"("portal_id", "code");

-- CreateIndex
CREATE INDEX "entity_records_portal_id_entity_definition_id_idx" ON "entity_records"("portal_id", "entity_definition_id");

-- CreateIndex
CREATE INDEX "entity_records_status_item_id_idx" ON "entity_records"("status_item_id");

-- CreateIndex
CREATE INDEX "entity_records_stage_id_idx" ON "entity_records"("stage_id");

-- CreateIndex
CREATE INDEX "status_sets_portal_id_idx" ON "status_sets"("portal_id");

-- CreateIndex
CREATE UNIQUE INDEX "status_sets_portal_id_entity_definition_id_code_key" ON "status_sets"("portal_id", "entity_definition_id", "code");

-- CreateIndex
CREATE INDEX "status_items_status_set_id_idx" ON "status_items"("status_set_id");

-- CreateIndex
CREATE UNIQUE INDEX "status_items_status_set_id_key_key" ON "status_items"("status_set_id", "key");

-- CreateIndex
CREATE INDEX "field_definitions_entity_definition_id_idx" ON "field_definitions"("entity_definition_id");

-- CreateIndex
CREATE INDEX "field_definitions_relation_target_entity_definition_id_idx" ON "field_definitions"("relation_target_entity_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_definitions_entity_definition_id_field_key_key" ON "field_definitions"("entity_definition_id", "field_key");

-- CreateIndex
CREATE INDEX "field_options_field_definition_id_idx" ON "field_options"("field_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_options_field_definition_id_value_key_key" ON "field_options"("field_definition_id", "value_key");

-- CreateIndex
CREATE INDEX "form_definitions_portal_id_idx" ON "form_definitions"("portal_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_definitions_portal_id_entity_definition_id_purpose_key" ON "form_definitions"("portal_id", "entity_definition_id", "purpose");

-- CreateIndex
CREATE INDEX "form_definition_items_form_definition_id_idx" ON "form_definition_items"("form_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_definition_items_form_definition_id_field_definition_i_key" ON "form_definition_items"("form_definition_id", "field_definition_id");

-- CreateIndex
CREATE INDEX "field_values_portal_id_idx" ON "field_values"("portal_id");

-- CreateIndex
CREATE INDEX "field_values_entity_record_id_idx" ON "field_values"("entity_record_id");

-- CreateIndex
CREATE INDEX "field_values_field_definition_id_idx" ON "field_values"("field_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_values_entity_record_id_field_definition_id_value_ind_key" ON "field_values"("entity_record_id", "field_definition_id", "value_index");

-- CreateIndex
CREATE INDEX "record_relations_source_record_id_idx" ON "record_relations"("source_record_id");

-- CreateIndex
CREATE INDEX "record_relations_target_record_id_idx" ON "record_relations"("target_record_id");

-- CreateIndex
CREATE INDEX "record_relations_portal_id_idx" ON "record_relations"("portal_id");

-- CreateIndex
CREATE UNIQUE INDEX "record_relations_field_definition_id_source_record_id_targe_key" ON "record_relations"("field_definition_id", "source_record_id", "target_record_id");

-- CreateIndex
CREATE INDEX "stage_categories_portal_id_idx" ON "stage_categories"("portal_id");

-- CreateIndex
CREATE UNIQUE INDEX "stage_categories_portal_id_entity_definition_id_code_key" ON "stage_categories"("portal_id", "entity_definition_id", "code");

-- CreateIndex
CREATE INDEX "stages_stage_category_id_idx" ON "stages"("stage_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "registration_links_token_key" ON "registration_links"("token");

-- CreateIndex
CREATE INDEX "registration_links_portal_id_idx" ON "registration_links"("portal_id");

-- CreateIndex
CREATE INDEX "registration_links_token_idx" ON "registration_links"("token");

-- CreateIndex
CREATE UNIQUE INDEX "employee_invitations_token_key" ON "employee_invitations"("token");

-- CreateIndex
CREATE INDEX "employee_invitations_portal_id_email_idx" ON "employee_invitations"("portal_id", "email");

-- CreateIndex
CREATE INDEX "employee_invitations_token_idx" ON "employee_invitations"("token");

-- CreateIndex
CREATE INDEX "portal_reviews_portal_id_idx" ON "portal_reviews"("portal_id");

-- CreateIndex
CREATE UNIQUE INDEX "portal_reviews_portal_id_user_id_key" ON "portal_reviews"("portal_id", "user_id");

-- CreateIndex
CREATE INDEX "product_reviews_portal_id_idx" ON "product_reviews"("portal_id");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_idx" ON "product_reviews"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_product_id_user_id_key" ON "product_reviews"("product_id", "user_id");

-- CreateIndex
CREATE INDEX "storage_files_user_id_idx" ON "storage_files"("user_id");

-- CreateIndex
CREATE INDEX "storage_files_portal_id_idx" ON "storage_files"("portal_id");

-- CreateIndex
CREATE INDEX "storage_files_category_idx" ON "storage_files"("category");

-- CreateIndex
CREATE INDEX "storage_files_storage_type_idx" ON "storage_files"("storage_type");

-- CreateIndex
CREATE INDEX "storage_files_created_at_idx" ON "storage_files"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_entity_record_id_key" ON "qr_codes"("entity_record_id");

-- CreateIndex
CREATE INDEX "qr_codes_entity_record_id_idx" ON "qr_codes"("entity_record_id");

-- CreateIndex
CREATE INDEX "qr_codes_encrypted_code_idx" ON "qr_codes"("encrypted_code");

-- CreateIndex
CREATE INDEX "qr_codes_expires_at_idx" ON "qr_codes"("expires_at");

-- CreateIndex
CREATE INDEX "presence_sessions_entity_record_id_idx" ON "presence_sessions"("entity_record_id");

-- CreateIndex
CREATE INDEX "presence_sessions_employee_id_idx" ON "presence_sessions"("employee_id");

-- CreateIndex
CREATE INDEX "presence_sessions_entered_at_idx" ON "presence_sessions"("entered_at");

-- CreateIndex
CREATE INDEX "presence_sessions_exited_at_idx" ON "presence_sessions"("exited_at");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_units_code_key" ON "measurement_units"("code");

-- CreateIndex
CREATE INDEX "measurement_units_code_idx" ON "measurement_units"("code");

-- CreateIndex
CREATE INDEX "measurement_units_is_active_idx" ON "measurement_units"("is_active");

-- CreateIndex
CREATE INDEX "product_categories_portal_id_idx" ON "product_categories"("portal_id");

-- CreateIndex
CREATE INDEX "product_categories_code_idx" ON "product_categories"("code");

-- CreateIndex
CREATE INDEX "product_categories_parent_id_idx" ON "product_categories"("parent_id");

-- CreateIndex
CREATE INDEX "product_categories_is_active_idx" ON "product_categories"("is_active");

-- CreateIndex
CREATE INDEX "product_categories_sort_order_idx" ON "product_categories"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_portal_id_code_key" ON "product_categories"("portal_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "products_entity_record_id_key" ON "products"("entity_record_id");

-- CreateIndex
CREATE INDEX "products_portal_id_idx" ON "products"("portal_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_measurement_unit_id_idx" ON "products"("measurement_unit_id");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "products_is_available_idx" ON "products"("is_available");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_portal_id_sku_key" ON "products"("portal_id", "sku");

-- CreateIndex
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");

-- CreateIndex
CREATE INDEX "product_images_sort_order_idx" ON "product_images"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "orders_entity_record_id_key" ON "orders"("entity_record_id");

-- CreateIndex
CREATE INDEX "orders_portal_id_idx" ON "orders"("portal_id");

-- CreateIndex
CREATE INDEX "orders_member_id_idx" ON "orders"("member_id");

-- CreateIndex
CREATE INDEX "orders_employee_id_idx" ON "orders"("employee_id");

-- CreateIndex
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_payment_status_idx" ON "orders"("payment_status");

-- CreateIndex
CREATE INDEX "orders_ordered_at_idx" ON "orders"("ordered_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_portal_id_order_number_key" ON "orders"("portal_id", "order_number");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "financial_transactions_portal_id_idx" ON "financial_transactions"("portal_id");

-- CreateIndex
CREATE INDEX "financial_transactions_order_id_idx" ON "financial_transactions"("order_id");

-- CreateIndex
CREATE INDEX "financial_transactions_entity_record_id_idx" ON "financial_transactions"("entity_record_id");

-- CreateIndex
CREATE INDEX "financial_transactions_type_idx" ON "financial_transactions"("type");

-- CreateIndex
CREATE INDEX "financial_transactions_direction_idx" ON "financial_transactions"("direction");

-- CreateIndex
CREATE INDEX "financial_transactions_transaction_date_idx" ON "financial_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "financial_transactions_created_by_idx" ON "financial_transactions"("created_by");

-- AddForeignKey
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_signatures" ADD CONSTRAINT "user_signatures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_admins" ADD CONSTRAINT "platform_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_platform_admin_id_fkey" FOREIGN KEY ("platform_admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_entity_record_id_fkey" FOREIGN KEY ("entity_record_id") REFERENCES "entity_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_registration_link_id_fkey" FOREIGN KEY ("registration_link_id") REFERENCES "registration_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_entity_record_id_fkey" FOREIGN KEY ("entity_record_id") REFERENCES "entity_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "employee_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_subscriptions" ADD CONSTRAINT "portal_subscriptions_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_subscriptions" ADD CONSTRAINT "portal_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_field_templates" ADD CONSTRAINT "global_field_templates_global_entity_template_id_fkey" FOREIGN KEY ("global_entity_template_id") REFERENCES "global_entity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_field_option_templates" ADD CONSTRAINT "global_field_option_templates_global_field_template_id_fkey" FOREIGN KEY ("global_field_template_id") REFERENCES "global_field_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_status_set_templates" ADD CONSTRAINT "global_status_set_templates_global_entity_template_id_fkey" FOREIGN KEY ("global_entity_template_id") REFERENCES "global_entity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_status_item_templates" ADD CONSTRAINT "global_status_item_templates_global_status_set_template_id_fkey" FOREIGN KEY ("global_status_set_template_id") REFERENCES "global_status_set_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_stage_category_templates" ADD CONSTRAINT "global_stage_category_templates_global_entity_template_id_fkey" FOREIGN KEY ("global_entity_template_id") REFERENCES "global_entity_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_stage_templates" ADD CONSTRAINT "global_stage_templates_global_stage_category_template_id_fkey" FOREIGN KEY ("global_stage_category_template_id") REFERENCES "global_stage_category_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_definitions" ADD CONSTRAINT "entity_definitions_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_definitions" ADD CONSTRAINT "entity_definitions_global_template_id_fkey" FOREIGN KEY ("global_template_id") REFERENCES "global_entity_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_records" ADD CONSTRAINT "entity_records_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_records" ADD CONSTRAINT "entity_records_entity_definition_id_fkey" FOREIGN KEY ("entity_definition_id") REFERENCES "entity_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_records" ADD CONSTRAINT "entity_records_status_item_id_fkey" FOREIGN KEY ("status_item_id") REFERENCES "status_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_records" ADD CONSTRAINT "entity_records_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_records" ADD CONSTRAINT "entity_records_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_sets" ADD CONSTRAINT "status_sets_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_sets" ADD CONSTRAINT "status_sets_entity_definition_id_fkey" FOREIGN KEY ("entity_definition_id") REFERENCES "entity_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_items" ADD CONSTRAINT "status_items_status_set_id_fkey" FOREIGN KEY ("status_set_id") REFERENCES "status_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_entity_definition_id_fkey" FOREIGN KEY ("entity_definition_id") REFERENCES "entity_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_relation_target_entity_definition_id_fkey" FOREIGN KEY ("relation_target_entity_definition_id") REFERENCES "entity_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_options" ADD CONSTRAINT "field_options_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_entity_definition_id_fkey" FOREIGN KEY ("entity_definition_id") REFERENCES "entity_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_definition_items" ADD CONSTRAINT "form_definition_items_form_definition_id_fkey" FOREIGN KEY ("form_definition_id") REFERENCES "form_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_definition_items" ADD CONSTRAINT "form_definition_items_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_entity_record_id_fkey" FOREIGN KEY ("entity_record_id") REFERENCES "entity_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_values" ADD CONSTRAINT "field_values_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_field_definition_id_fkey" FOREIGN KEY ("field_definition_id") REFERENCES "field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "entity_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "record_relations" ADD CONSTRAINT "record_relations_target_record_id_fkey" FOREIGN KEY ("target_record_id") REFERENCES "entity_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_categories" ADD CONSTRAINT "stage_categories_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_categories" ADD CONSTRAINT "stage_categories_entity_definition_id_fkey" FOREIGN KEY ("entity_definition_id") REFERENCES "entity_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_stage_category_id_fkey" FOREIGN KEY ("stage_category_id") REFERENCES "stage_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_links" ADD CONSTRAINT "registration_links_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_links" ADD CONSTRAINT "registration_links_entity_definition_id_fkey" FOREIGN KEY ("entity_definition_id") REFERENCES "entity_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_links" ADD CONSTRAINT "registration_links_form_definition_id_fkey" FOREIGN KEY ("form_definition_id") REFERENCES "form_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_links" ADD CONSTRAINT "registration_links_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_invitations" ADD CONSTRAINT "employee_invitations_invited_by_employee_id_fkey" FOREIGN KEY ("invited_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_reviews" ADD CONSTRAINT "portal_reviews_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_reviews" ADD CONSTRAINT "portal_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_files" ADD CONSTRAINT "storage_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_files" ADD CONSTRAINT "storage_files_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_entity_record_id_fkey" FOREIGN KEY ("entity_record_id") REFERENCES "entity_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence_sessions" ADD CONSTRAINT "presence_sessions_entity_record_id_fkey" FOREIGN KEY ("entity_record_id") REFERENCES "entity_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presence_sessions" ADD CONSTRAINT "presence_sessions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_entity_record_id_fkey" FOREIGN KEY ("entity_record_id") REFERENCES "entity_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_measurement_unit_id_fkey" FOREIGN KEY ("measurement_unit_id") REFERENCES "measurement_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_entity_record_id_fkey" FOREIGN KEY ("entity_record_id") REFERENCES "entity_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_entity_record_id_fkey" FOREIGN KEY ("entity_record_id") REFERENCES "entity_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
