"use client";

import { useLocale, useTranslations } from "next-intl";

import { CircleDot, DoorOpen, FormInput, ListChecks, Scale, UserPlus } from "lucide-react";

import { usePermissions } from "@/modules/entities/access";
import { getFieldDisplayLabel, useEntityFields } from "@/modules/entities/entity-settings";
import { useMemberStatusItems } from "@/modules/entities/member";
import { usePresenceSettings } from "@/modules/entities/presence";
import { brandHas } from "@/modules/shared/config/brand";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { SettingsTile, SettingsTileGrid } from "../settings-tile";

import { RegistrationLinksTile } from "./registration-links-tile";

const MEMBER = "member";

const FORM_PURPOSES = [
    "public_registration",
    "crm_create",
    "crm_detail",
    "member_cabinet",
] as const;

/** Участники: анкета и формы (`settings.structure`), ссылки, правила клуба и присутствие — по правам. */
export function MembersPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const locale = useLocale();
    const link = useLocalizedLink();
    const { can } = usePermissions();
    const fields = useEntityFields(MEMBER);
    const statuses = useMemberStatusItems(true);
    const hasDoor = brandHas("presence");
    const presence = usePresenceSettings(hasDoor);
    const cap = presence.data?.maxSessionHours ?? null;

    const activeFields = (fields.data ?? []).filter((field) => field.isActive && !field.hidden);
    const entityPage = `${ROUTES.CRM_SETTINGS_ENTITIES}/${MEMBER}`;
    const canStructure = can("settings.structure");
    const canClub = can("settings.club");

    return (
        <SettingsTileGrid>
            {canStructure && (
                <>
                    <SettingsTile
                        icon={FormInput}
                        title={t("memberFields.title")}
                        description={t("memberFields.description")}
                        metric={activeFields.length}
                        metricLabel={t("memberFields.metric")}
                        items={activeFields.map((field) => getFieldDisplayLabel(field, locale))}
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
                </>
            )}
            {can("members.invite") && <RegistrationLinksTile />}
            {canClub && (
                <>
                    {brandHas("club-policy") && (
                    <SettingsTile
                        icon={Scale}
                        title={t("clubPolicy.title")}
                        description={t("clubPolicy.description")}
                        href={link(ROUTES.CRM_SETTINGS_CLUB_POLICY)}
                    />
                    )}
                    {hasDoor && (
                    <SettingsTile
                        icon={DoorOpen}
                        title={t("presence.title")}
                        description={t("presence.description")}
                        metric={presence.data?.autoExitTime}
                        metricLabel={t("presence.metric")}
                        items={
                            presence.data
                                ? [
                                      presence.data.timezone,
                                      cap === null
                                          ? t("presence.noCap")
                                          : t("presence.cap", { hours: cap }),
                                  ]
                                : []
                        }
                        loading={presence.isLoading}
                        href={link(ROUTES.CRM_SETTINGS_PRESENCE)}
                    />
                    )}
                </>
            )}
            {can("members.create") && (
                <SettingsTile
                    icon={UserPlus}
                    title={t("newMember.title")}
                    description={t("newMember.description")}
                    href={link(ROUTES.CRM_MEMBER_NEW)}
                />
            )}
        </SettingsTileGrid>
    );
}
