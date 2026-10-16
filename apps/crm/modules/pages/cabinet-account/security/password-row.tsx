"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { KeyRound } from "lucide-react";

import { Button } from "@workspace/ui";

import { SettingRow } from "@/modules/shared/ui/SettingRow";

import { PasswordDialog } from "./password-dialog";

/** Пароль: задан ли, и кнопка задать или сменить его. */
export function PasswordRow({ hasPassword }: { hasPassword: boolean }) {
    const t = useTranslations("cabinet.account.security.password");
    const [open, setOpen] = useState(false);

    return (
        <SettingRow title={t("title")} description={hasPassword ? t("isSet") : t("notSet")}>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                <KeyRound aria-hidden="true" />
                {hasPassword ? t("change") : t("set")}
            </Button>
            <PasswordDialog open={open} onOpenChange={setOpen} hasPassword={hasPassword} />
        </SettingRow>
    );
}
