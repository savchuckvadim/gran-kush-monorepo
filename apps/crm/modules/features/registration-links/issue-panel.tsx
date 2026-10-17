"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput, FieldSelect } from "@workspace/ui";

import {
    buildJoinUrl,
    type RegistrationLinkKind,
    useCreateRegistrationLink,
    useRegistrationLinks,
} from "@/modules/entities/registration-links";
import { LinkUrlField } from "@/modules/shared/ui/LinkUrlField";

const ISSUABLE_KINDS: RegistrationLinkKind[] = ["public_link", "kiosk"];

/** «Выдать»: the club's shared link at hand and a form for a named one (desk, tablet, event). */
export function IssuePanel() {
    const t = useTranslations("crm.registrationLinks");
    const locale = useLocale();
    const ready = useRegistrationLinks({ status: "ready", limit: 50 });
    const create = useCreateRegistrationLink();

    const [name, setName] = useState("");
    const [kind, setKind] = useState<RegistrationLinkKind>("public_link");
    const [maxUses, setMaxUses] = useState("");
    const [error, setError] = useState<string | null>(null);

    const shared = ready.data?.links.find((link) => link.kind === "public_link");

    const issue = async (body: { name: string; kind: RegistrationLinkKind; maxUses?: number }) => {
        setError(null);
        try {
            await create.mutateAsync(body);
            toast.success(t("create.created"));
            return true;
        } catch (e) {
            setError(getApiErrorMessage(e));
            return false;
        }
    };

    const submit = async () => {
        const limit = maxUses.trim() ? Number.parseInt(maxUses, 10) : undefined;
        const done = await issue({
            name: name.trim(),
            kind,
            ...(limit && limit > 0 ? { maxUses: limit } : {}),
        });
        if (done) {
            setName("");
            setMaxUses("");
        }
    };

    return (
        <div className="space-y-6">
            <section className="space-y-2">
                <h3 className="text-sm font-semibold">{t("shared.title")}</h3>
                <p className="text-muted-foreground text-xs">{t("shared.hint")}</p>
                {ready.isLoading ? (
                    <Loader2 className="text-muted-foreground size-4 animate-spin" />
                ) : shared ? (
                    <LinkUrlField url={buildJoinUrl(locale, shared.token)} />
                ) : (
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-muted-foreground text-sm">{t("shared.none")}</span>
                        <Button
                            type="button"
                            size="sm"
                            disabled={create.isPending}
                            onClick={() =>
                                void issue({ name: t("shared.defaultName"), kind: "public_link" })
                            }
                        >
                            {t("shared.create")}
                        </Button>
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t("create.title")}</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                    <FieldInput
                        label={t("create.name")}
                        placeholder={t("create.namePlaceholder")}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                    <FieldSelect
                        label={t("create.kind")}
                        options={ISSUABLE_KINDS.map((value) => ({
                            value,
                            label: t(`kinds.${value}`),
                        }))}
                        value={kind}
                        onValueChange={(value) => setKind(value as RegistrationLinkKind)}
                    />
                    <FieldInput
                        label={t("create.maxUses")}
                        type="number"
                        min={1}
                        placeholder={t("create.maxUsesPlaceholder")}
                        value={maxUses}
                        onChange={(event) => setMaxUses(event.target.value)}
                    />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button
                    type="button"
                    onClick={() => void submit()}
                    disabled={!name.trim() || create.isPending}
                >
                    <Plus />
                    {create.isPending ? t("create.submitting") : t("create.submit")}
                </Button>
            </section>
        </div>
    );
}
