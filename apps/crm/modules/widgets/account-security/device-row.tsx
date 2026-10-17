"use client";

import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Badge, Button } from "@workspace/ui";

import { type AccountSession, useEndSession } from "@/modules/entities/account-security";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { useDateTimeFormat } from "@/modules/shared/lib/use-date-format";
import { SettingRow } from "@/modules/shared/ui/SettingRow";

import { describeUserAgent } from "./describe-user-agent";

/** Одно устройство: приложение, браузер, как и когда вошли. Чужое устройство можно закрыть. */
export function DeviceRow({ session }: { session: AccountSession }) {
    const t = useTranslations("account.security.devices");
    const formatDateTime = useDateTimeFormat();
    const end = useEndSession();

    const device = describeUserAgent(session.userAgent) ?? t("unknownDevice");
    const description = [
        t("signedIn", {
            method: t(`method.${session.signInMethod}`),
            date: formatDateTime(session.createdAt),
        }),
        t("lastActive", { date: formatDateTime(session.lastUsedAt) }),
        session.ipAddress,
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <SettingRow
            title={
                <span className="flex flex-wrap items-center gap-2">
                    {device}
                    <Badge variant="secondary">{t(`audience.${session.audience}`)}</Badge>
                    {session.current && <Badge>{t("current")}</Badge>}
                </span>
            }
            description={description}
        >
            {!session.current && (
                <Button
                    variant="outline"
                    size="sm"
                    disabled={end.isPending}
                    onClick={() =>
                        end.mutate(session.id, {
                            onSuccess: () => toast.success(t("ended")),
                            onError: (error) => notifyApiError(error),
                        })
                    }
                >
                    {t("end")}
                </Button>
            )}
        </SettingRow>
    );
}
