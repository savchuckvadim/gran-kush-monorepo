"use client";

import { useTranslations } from "next-intl";

import { MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button, FieldInput, ModalDialog } from "@workspace/ui";

import { useRequestIdentityEmail } from "@/modules/entities/cabinet-account";

import { useTelegramErrorText } from "./use-telegram-error-text";

interface TelegramEmailDialogProps {
    /** Билет шага «укажите почту»; `null` — диалог закрыт */
    ticket: string | null;
    onClose: () => void;
}

/**
 * Первый вход через Telegram: у Telegram нет почты, а клубы пишут на неё. Человек называет адрес,
 * на него приходит ссылка — по ней он и входит (аккаунт заводится или Telegram привязывается к
 * существующему с этой почтой).
 */
export function TelegramEmailDialog({ ticket, onClose }: TelegramEmailDialogProps) {
    const t = useTranslations("cabinet.auth.telegram.email");
    const errorText = useTelegramErrorText();
    const request = useRequestIdentityEmail();
    const form = useForm<{ email: string }>({ defaultValues: { email: "" } });

    const close = () => {
        form.reset();
        request.reset();
        onClose();
    };

    const send = form.handleSubmit(({ email }) => {
        if (ticket) request.mutate({ ticket, email });
    });

    // Диалог живёт в портале, но React поднимает submit по дереву компонентов — до формы входа
    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.stopPropagation();
        void send(event);
    };

    return (
        <ModalDialog
            open={ticket !== null}
            onOpenChange={(open) => !open && close()}
            size="sm"
            title={request.isSuccess ? t("sentTitle") : t("title")}
            description={request.isSuccess ? undefined : t("description")}
            footer={
                request.isSuccess ? (
                    <Button onClick={close}>{t("close")}</Button>
                ) : (
                    <Button type="submit" form="telegram-email" disabled={request.isPending}>
                        {request.isPending ? t("sending") : t("send")}
                    </Button>
                )
            }
        >
            {request.isSuccess ? (
                <div className="space-y-2 text-center" role="status">
                    <MailCheck className="mx-auto size-10 text-success" aria-hidden="true" />
                    <p className="text-sm">{t("sent", { email: form.getValues("email") })}</p>
                </div>
            ) : (
                <form id="telegram-email" onSubmit={submit} noValidate className="space-y-3">
                    <FieldInput
                        type="email"
                        autoComplete="email"
                        label={t("label")}
                        required
                        error={form.formState.errors.email?.message}
                        {...form.register("email", {
                            required: t("required"),
                            pattern: { value: /^\S+@\S+\.\S+$/, message: t("invalid") },
                        })}
                    />
                    {request.error && (
                        <p role="alert" className="text-sm text-destructive">
                            {errorText(request.error)}
                        </p>
                    )}
                </form>
            )}
        </ModalDialog>
    );
}
