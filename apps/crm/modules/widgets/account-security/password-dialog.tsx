"use client";

import { useTranslations } from "next-intl";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { getApiErrorCode, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput, ModalDialog } from "@workspace/ui";

import { useSetAccountPassword } from "@/modules/entities/account-security";
import { isValidPassword } from "@/modules/shared/config/password-policy";

const WRONG_PASSWORD = "wrong_password";

interface PasswordValues {
    currentPassword: string;
    newPassword: string;
    confirm: string;
}

interface PasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Пароль уже есть — нужен текущий; нет (вход через Google) — задаётся сразу */
    hasPassword: boolean;
}

/** Задать или сменить пароль. Остальные устройства после этого выходят, это — остаётся. */
export function PasswordDialog({ open, onOpenChange, hasPassword }: PasswordDialogProps) {
    const t = useTranslations("account.security.password");
    const save = useSetAccountPassword();
    const form = useForm<PasswordValues>({
        defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
    });
    const { errors } = form.formState;
    const wrongCurrent = getApiErrorCode(save.error) === WRONG_PASSWORD;

    const close = (next: boolean) => {
        if (!next) {
            form.reset();
            save.reset();
        }
        onOpenChange(next);
    };

    const submit = form.handleSubmit((values) =>
        save.mutate(
            {
                newPassword: values.newPassword,
                ...(hasPassword ? { currentPassword: values.currentPassword } : {}),
            },
            {
                onSuccess: () => {
                    toast.success(t("saved"));
                    close(false);
                },
            }
        )
    );

    return (
        <ModalDialog
            open={open}
            onOpenChange={close}
            size="sm"
            title={hasPassword ? t("changeTitle") : t("setTitle")}
            description={t("description")}
            footer={
                <Button type="submit" form="account-password" disabled={save.isPending}>
                    {save.isPending ? t("saving") : t("save")}
                </Button>
            }
        >
            <form id="account-password" className="space-y-3" onSubmit={submit} noValidate>
                {hasPassword && (
                    <FieldInput
                        type="password"
                        autoComplete="current-password"
                        label={t("current")}
                        required
                        error={wrongCurrent ? t("wrongCurrent") : errors.currentPassword?.message}
                        {...form.register("currentPassword", { required: t("required") })}
                    />
                )}
                <FieldInput
                    type="password"
                    autoComplete="new-password"
                    label={t("new")}
                    helperText={t("rule")}
                    required
                    error={errors.newPassword?.message}
                    {...form.register("newPassword", {
                        required: t("required"),
                        validate: (value) => isValidPassword(value) || t("rule"),
                    })}
                />
                <FieldInput
                    type="password"
                    autoComplete="new-password"
                    label={t("confirm")}
                    required
                    error={errors.confirm?.message}
                    {...form.register("confirm", {
                        validate: (value, values) => value === values.newPassword || t("mismatch"),
                    })}
                />
                {save.error && !wrongCurrent && (
                    <p role="alert" className="text-sm text-destructive">
                        {getApiErrorMessage(save.error)}
                    </p>
                )}
            </form>
        </ModalDialog>
    );
}
