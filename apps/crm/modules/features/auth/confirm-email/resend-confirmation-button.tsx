"use client";

import { useTranslations } from "next-intl";

import { ApiClientError, getApiErrorMessage } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import { useResendEmailConfirmation } from "./use-resend-email-confirmation";

export function ResendConfirmationButton({ className }: { className?: string }) {
    const t = useTranslations("auth.confirmEmail");
    const resend = useResendEmailConfirmation();

    const errorText =
        resend.error instanceof ApiClientError && resend.error.status === 401
            ? t("resendNeedsLogin")
            : resend.error
              ? getApiErrorMessage(resend.error)
              : null;

    return (
        <div className={className}>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => resend.mutate()}
                disabled={resend.isPending || resend.isSuccess}
            >
                {resend.isSuccess ? t("sent") : resend.isPending ? t("submitting") : t("resend")}
            </Button>
            {errorText && <p className="mt-2 text-sm text-destructive">{errorText}</p>}
        </div>
    );
}
