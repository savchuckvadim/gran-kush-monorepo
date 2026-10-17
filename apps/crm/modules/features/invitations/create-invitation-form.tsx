"use client";

import { type FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { RoleSelect } from "@/modules/entities/access";
import { useCreateInvitation } from "@/modules/entities/invitations";
import { ROUTES } from "@/modules/shared/config/routes";

import { CreatedInvitationNotice } from "./created-invitation-notice";

interface CreateInvitationFormProps {
    /** Закрыть диалог — по «Готово» под ссылкой */
    onDone: () => void;
}

/**
 * Приглашение сотрудника по email. Ссылка уходит письмом, а здесь видна один раз — сразу после
 * создания: в списке приглашений токена нет (TASK-662). Поэтому форма не закрывает диалог сама,
 * а сменяется ссылкой; закрывает «Готово».
 */
export function CreateInvitationForm({ onDone }: CreateInvitationFormProps) {
    const t = useTranslations("crm.invitations.create");
    const locale = useLocale();
    const create = useCreateInvitation();

    const [email, setEmail] = useState("");
    const [role, setRole] = useState("employee");
    const [created, setCreated] = useState<{ email: string; url: string } | null>(null);

    if (created) {
        return <CreatedInvitationNotice email={created.email} url={created.url} onDone={onDone} />;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            const invitation = await create.mutateAsync({ email: email.trim(), role });
            setCreated({
                email: invitation.email,
                url: `${window.location.origin}/${locale}${ROUTES.INVITE}/${invitation.token}`,
            });
            toast.success(t("sent"));
        } catch {
            // текст ошибки — над кнопкой, из состояния мутации
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FieldInput
                label={t("email")}
                type="email"
                autoComplete="off"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
            />
            <RoleSelect label={t("role")} value={role} onValueChange={setRole} />
            {create.error ? (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(create.error)}
                </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={!email.trim() || create.isPending}>
                {create.isPending ? t("submitting") : t("submit")}
            </Button>
        </form>
    );
}
