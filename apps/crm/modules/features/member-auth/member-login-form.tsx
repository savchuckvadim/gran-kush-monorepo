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
import { API_BASE_URL } from "@/modules/shared/api";

const EMAIL_NOT_CONFIRMED = "Email not confirmed";

/** Вход через Google: обычная ссылка — куки ставит callback на API, а не fetch. */
function GoogleLoginButton({ returnTo }: { returnTo: string }) {
    const t = useTranslations("cabinet.auth.login");
    const locale = useLocale();
    const href = `${API_BASE_URL}/cabinet/auth/google/start?locale=${locale}&returnTo=${encodeURIComponent(returnTo)}`;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
                {t("or")}
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
            </div>
            <Button type="button" variant="outline" className="w-full" asChild>
                <a href={href}>
                    <GoogleMark />
                    {t("google")}
                </a>
            </Button>
        </div>
    );
}

function GoogleMark() {
    return (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
            />
            <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
            />
            <path
                fill="#FBBC05"
                d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11Z"
            />
            <path
                fill="#EA4335"
                d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
            />
        </svg>
    );
}

/** Вход участника. После успеха возвращает на страницу, с которой человека увели (`?from=`). */
export function MemberLoginForm() {
    const t = useTranslations("cabinet.auth.login");
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

            <GoogleLoginButton returnTo={from} />

            <p className="text-center text-sm text-muted-foreground">
                {t("noAccount")}{" "}
                <Link href={links.register} className="text-primary hover:underline">
                    {t("register")}
                </Link>
            </p>
        </form>
    );
}
