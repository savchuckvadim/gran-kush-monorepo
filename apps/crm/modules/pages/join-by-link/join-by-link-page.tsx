"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import type { SchemaRegisterViaLinkResponseDto } from "@workspace/api-client/core";
import type { FormSchemaField } from "@workspace/dynamic-forms";

import { useCabinetMe } from "@/modules/entities/cabinet-account";
import {
    getPublicRegistrationLink,
    useRegistrationLinkPresence,
} from "@/modules/entities/registration-links";
import { StatusCard } from "@/modules/shared/ui/StatusCard";

import { JoinDone } from "./join-done";
import { JoinRegistrationForm } from "./join-registration-form";
import { SignedInJoin } from "./signed-in-join";

// Documents and the signature are attached to an existing member later, so the public form
// asks only for data fields — the same rule as the CRM's own "new member" form.
const FILE_TYPES = new Set(["file", "signature", "document"]);

/**
 * Ссылка клуба — публичная страница CRM, общая для crm. и club. Кто пришёл:
 *
 * - вошедший участник (не на киоске) — вступает своим аккаунтом (`SignedInJoin`);
 * - гость — анкета с паролем или Google; после Google он возвращается сюда уже с сессией;
 * - киоск (общий планшет клуба) — только анкета, после «Готово» она сама сбрасывается.
 */
export function JoinByLinkPage({ token }: { token: string }) {
    const t = useTranslations("join");
    const [otherAccount, setOtherAccount] = useState(false);
    const [result, setResult] = useState<SchemaRegisterViaLinkResponseDto | null>(null);
    // Новый ключ — чистая анкета для следующего человека на киоске
    const [formKey, setFormKey] = useState(0);

    const info = useQuery({
        queryKey: ["public-registration-link", token],
        queryFn: () => getPublicRegistrationLink(token),
        retry: false,
    });
    const kiosk = info.data?.kind === "kiosk";
    const me = useCabinetMe({ enabled: Boolean(info.data) && !kiosk });

    // The club sees how many people have the form open; stops once the form is sent.
    useRegistrationLinkPresence(token, Boolean(info.data) && !result);

    const fields = useMemo(
        () =>
            (info.data?.schema.fields ?? []).filter(
                (field) => !FILE_TYPES.has(field.type)
            ) as FormSchemaField[],
        [info.data]
    );
    const nextPerson = useCallback(() => {
        setResult(null);
        setFormKey((key) => key + 1);
    }, []);

    if (info.isLoading || (me.isLoading && !kiosk)) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }
    if (info.isError || !info.data) {
        return <StatusCard tone="error" text={t("invalid")} />;
    }

    if (!kiosk && me.data && !otherAccount) {
        return (
            <SignedInJoin
                token={token}
                account={me.data}
                club={info.data.portalDisplayName}
                fields={fields}
                prefill={info.data.prefill?.fields}
                onUseOtherAccount={() => setOtherAccount(true)}
            />
        );
    }

    if (result) {
        return (
            <JoinDone
                club={info.data.portalDisplayName}
                accountCreated={result.accountCreated}
                kiosk={kiosk}
                onNext={nextPerson}
            />
        );
    }

    return (
        <JoinRegistrationForm
            key={formKey}
            token={token}
            info={info.data}
            fields={fields}
            onDone={setResult}
        />
    );
}
