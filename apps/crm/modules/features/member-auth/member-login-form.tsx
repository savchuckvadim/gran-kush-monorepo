"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiClientError, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { cabinetKeys, loginMember } from "@/modules/entities/cabinet-account";
import { safeReturnPath, useCabinetLinks } from "@/modules/processes/member-auth";
import { googleSignInUrl } from "@/modules/shared/api/google-sign-in";
import { GoogleButton } from "@/modules/shared/ui/GoogleButton";

import { TelegramSignIn } from "./telegram/telegram-sign-in";

const EMAIL_NOT_CONFIRMED = "Email not confirmed";

/** Вход участника. После успеха возвращает на страницу, с которой человека увели (`?from=`). */
export function MemberLoginForm() {
    const t = useTranslations("cabinet.auth.login");
    const locale = useLocale();
    const links = useCabinetLinks();
    const router = useRouter();
    const queryClient = useQueryClient();
    const params = useSearchParams();
    const from = safeReturnPath(params.get("from"), links.home);
    const urlError = params.get("error");

    const schema = z.object({
        email: z.string().email(t("invalidEmail")),
        password: z.string().min(1, t("passwordRequired")),
    });
    type FormData = z.infer<typeof schema>;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const login = useMutation({
        mutationFn: loginMember,
        onSuccess: async () => {
            // Сессия появилась: «me» и всё остальное в кабинете надо перечитать
            await queryClient.invalidateQueries({ queryKey: cabinetKeys.all });
            router.replace(from);
        },
    });

    const failure = login.error
        ? login.error instanceof ApiClientError && login.error.status === 401
            ? login.error.message === EMAIL_NOT_CONFIRMED
                ? t("emailNotConfirmed")
                : t("invalidCredentials")
            : getApiErrorMessage(login.error)
        : null;

    return (
        <form
            // До гидратации браузер отправил бы форму сам: POST не кладёт пароль в адрес
            method="post"
            onSubmit={handleSubmit((data) => login.mutate(data))}
            className="space-y-4"
        >
            {failure && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {failure}
                </div>
            )}
            {!failure && (urlError === "google_auth" || urlError === "google_off") && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {urlError === "google_off" ? t("googleOff") : t("googleError")}
                </div>
            )}

            <FieldInput
                label={t("email")}
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                required
                {...register("email")}
            />
            <div className="space-y-2">
                <FieldInput
                    label={t("password")}
                    type="password"
                    autoComplete="current-password"
                    error={errors.password?.message}
                    required
                    {...register("password")}
                />
                <Link href={links.forgotPassword} className="text-sm text-primary hover:underline">
                    {t("forgotPassword")}
                </Link>
            </div>

            <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? t("submitting") : t("submit")}
            </Button>

            <GoogleButton
                href={googleSignInUrl("cabinet", { locale, returnTo: from })}
                label={t("google")}
                separator={t("or")}
            />
            <TelegramSignIn returnTo={from} />

            <p className="text-center text-sm text-muted-foreground">
                {t("noAccount")}{" "}
                <Link href={links.register} className="text-primary hover:underline">
                    {t("register")}
                </Link>
            </p>
        </form>
    );
}
