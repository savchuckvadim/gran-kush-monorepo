"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import {
    Boxes,
    CircleDot,
    CreditCard,
    FolderTree,
    FormInput,
    Link2,
    ListChecks,
    Mail,
    Palette,
    Ruler,
    SwatchBook,
    UserPlus,
    Users,
} from "lucide-react";

import { useCategories } from "@/modules/entities/category";
import { useEmployees } from "@/modules/entities/employee";
import { useEntityDefinitions, useEntityFields } from "@/modules/entities/entity-settings";
import { useInvitations } from "@/modules/entities/invitations";
import { useMeasurementUnits } from "@/modules/entities/measurement-unit";
import { useMemberStatusItems } from "@/modules/entities/member";
import { usePortalInfo } from "@/modules/entities/portal";
import { useRegistrationLinks } from "@/modules/entities/registration-links";
import { SkinPickerSheet } from "@/modules/features";
import { useSkinText } from "@/modules/features/skin-picker/use-skin-text";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { useSkin } from "@/modules/shared/providers/skin-provider";
import {
    CategoryManagementWidget,
    MeasurementUnitManagementWidget,
} from "@/modules/widgets/settings";

import { SettingsTile, SettingsTileGrid, type TileTone } from "./settings-tile";

const MEMBER = "member";
const FORM_PURPOSES = [
    "public_registration",
    "crm_create",
    "crm_detail",
    "member_cabinet",
] as const;

export function MembersPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const fields = useEntityFields(MEMBER);
    const statuses = useMemberStatusItems(true);
    const links = useRegistrationLinks();

    const activeFields = (fields.data ?? []).filter((field) => field.isActive && !field.hidden);
    const activeLinks = (links.data ?? []).filter((item) => item.isActive);
    const entityPage = `${ROUTES.CRM_SETTINGS_ENTITIES}/${MEMBER}`;

    return (
        <SettingsTileGrid>
            <SettingsTile
                icon={FormInput}
                title={t("memberFields.title")}
                description={t("memberFields.description")}
                metric={activeFields.length}
                metricLabel={t("memberFields.metric")}
                items={activeFields.map(
                    (field) => field.labelOverride ?? field.label ?? field.fieldKey
                )}
                loading={fields.isLoading}
                href={link(`${entityPage}?tab=fields`)}
            />
            <SettingsTile
                icon={ListChecks}
                title={t("memberForms.title")}
                description={t("memberForms.description")}
                metric={FORM_PURPOSES.length}
                metricLabel={t("memberForms.metric")}
                items={FORM_PURPOSES.map((purpose) => t(`memberForms.purposes.${purpose}`))}
                href={link(`${entityPage}?tab=forms`)}
            />
            <SettingsTile
                icon={CircleDot}
                title={t("memberStatuses.title")}
                description={t("memberStatuses.description")}
                metric={statuses.data?.length ?? 0}
                metricLabel={t("memberStatuses.metric")}
                items={(statuses.data ?? []).map((status) => status.label)}
                loading={statuses.isLoading}
                href={link(`${entityPage}?tab=statuses`)}
            />
            <SettingsTile
                icon={Link2}
                title={t("registrationLinks.title")}
                description={t("registrationLinks.description")}
                metric={activeLinks.length}
                metricLabel={t("registrationLinks.metric", { total: links.data?.length ?? 0 })}
                items={activeLinks.map((item) => item.name)}
                loading={links.isLoading}
                href={link(ROUTES.CRM_SETTINGS_REGISTRATION_LINKS)}
            />
            <SettingsTile
                icon={UserPlus}
                title={t("newMember.title")}
                description={t("newMember.description")}
                href={link(ROUTES.CRM_MEMBER_NEW)}
            />
        </SettingsTileGrid>
    );
}

export function TeamPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const employees = useEmployees({ isActive: true, limit: 50 });
    const invitations = useInvitations();

    const pending = (invitations.data ?? []).filter((item) => item.status === "pending");

    return (
        <SettingsTileGrid>
            <SettingsTile
                icon={Users}
                title={t("employees.title")}
                description={t("employees.description")}
                metric={employees.data?.total ?? 0}
                metricLabel={t("employees.metric")}
                items={(employees.data?.items ?? []).map((employee) => employee.email)}
                loading={employees.isLoading}
                href={link(ROUTES.CRM_EMPLOYEES)}
            />
            <SettingsTile
                icon={Mail}
                title={t("invitations.title")}
                description={t("invitations.description")}
                metric={pending.length}
                metricLabel={t("invitations.metric")}
                items={pending.map((item) => item.email)}
                loading={invitations.isLoading}
                href={link(ROUTES.CRM_SETTINGS_INVITATIONS)}
            />
        </SettingsTileGrid>
    );
}

const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export function CatalogPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const categories = useCategories();
    const units = useMeasurementUnits();

    return (
        <div className="space-y-6">
            <SettingsTileGrid>
                <SettingsTile
                    icon={FolderTree}
                    title={t("categories.title")}
                    description={t("categories.description")}
                    metric={categories.data?.length ?? 0}
                    metricLabel={t("categories.metric")}
                    items={(categories.data ?? []).map((category) => category.name)}
                    loading={categories.isLoading}
                    onClick={() => scrollTo("settings-categories")}
                />
                <SettingsTile
                    icon={Ruler}
                    title={t("units.title")}
                    description={t("units.description")}
                    metric={units.data?.length ?? 0}
                    metricLabel={t("units.metric")}
                    items={(units.data ?? []).map((unit) => unit.name)}
                    loading={units.isLoading}
                    onClick={() => scrollTo("settings-units")}
                />
            </SettingsTileGrid>
            <div id="settings-categories" className="scroll-mt-20">
                <CategoryManagementWidget />
            </div>
            <div id="settings-units" className="scroll-mt-20">
                <MeasurementUnitManagementWidget />
            </div>
        </div>
    );
}

export function EntitiesPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const definitions = useEntityDefinitions();
    const active = (definitions.data ?? []).filter((item) => item.isActive !== false && item.code);

    return (
        <SettingsTileGrid>
            <SettingsTile
                icon={Boxes}
                title={t("entities.title")}
                description={t("entities.description")}
                metric={active.length}
                metricLabel={t("entities.metric")}
                items={active.map((item) => item.name ?? item.code ?? "")}
                loading={definitions.isLoading}
                href={link(ROUTES.CRM_SETTINGS_ENTITIES)}
            />
            {active.map((item) => (
                <SettingsTile
                    key={item.code}
                    icon={item.isSystem ? ListChecks : Boxes}
                    title={item.name ?? item.code ?? ""}
                    description={t("entity.description")}
                    badge={{
                        label: item.isSystem ? t("entity.system") : t("entity.custom"),
                        tone: "muted",
                    }}
                    href={link(`${ROUTES.CRM_SETTINGS_ENTITIES}/${item.code}`)}
                />
            ))}
        </SettingsTileGrid>
    );
}

const STATUS_TONE: Record<string, TileTone> = {
    active: "ok",
    trialing: "ok",
    past_due: "warn",
    canceled: "warn",
    expired: "warn",
};

export function BillingPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const tBilling = useTranslations("crm.billing");
    const locale = useLocale();
    const link = useLocalizedLink();
    const { data: info, isLoading } = usePortalInfo();
    const subscription = info?.subscription;
    const date = (value: string | null | undefined) =>
        value
            ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value))
            : null;
    const until =
        subscription?.status === "trialing"
            ? date(subscription.trialEndsAt)
            : subscription?.status === "past_due"
              ? date(subscription.graceEndsAt)
              : null;

    return (
        <SettingsTileGrid>
            <SettingsTile
                icon={CreditCard}
                title={t("billing.title")}
                description={t("billing.description")}
                metric={subscription?.planName ?? "—"}
                metricLabel={until ? t("billing.until", { date: until }) : undefined}
                badge={
                    subscription
                        ? {
                              label: tBilling(`status.${subscription.status}`),
                              tone: STATUS_TONE[subscription.status] ?? "muted",
                          }
                        : undefined
                }
                loading={isLoading}
                href={link(ROUTES.CRM_SETTINGS_BILLING)}
            />
        </SettingsTileGrid>
    );
}

export function AppearancePanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const text = useSkinText();
    const { skin, definition, isEcoActive } = useSkin();
    const { resolvedTheme } = useTheme();
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const mode = resolvedTheme === "dark" ? "dark" : "light";

    return (
        <>
            <SettingsTileGrid>
                <SettingsTile
                    icon={Palette}
                    title={t("appearance.title")}
                    description={t("appearance.description")}
                    metric={text.name(skin)}
                    items={[
                        text.modeName(definition, mode),
                        ...(isEcoActive ? [t("appearance.eco")] : []),
                    ]}
                    href={link(ROUTES.CRM_SETTINGS_APPEARANCE)}
                />
                <SettingsTile
                    icon={SwatchBook}
                    title={t("quickSkin.title")}
                    description={t("quickSkin.description")}
                    onClick={() => setIsPickerOpen(true)}
                />
            </SettingsTileGrid>
            <SkinPickerSheet open={isPickerOpen} onOpenChange={setIsPickerOpen} />
        </>
    );
}
