"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";

import { getApiErrorCode, getApiErrorMessage } from "@workspace/api-client/core";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

/**
 * Код 409 от API: у адреса уже есть аккаунт с владельцем, прикрепить его к клубу может только
 * приглашение. Другой 409 (сотрудник уже в клубе) этим советом не лечится — для него остаётся
 * текст ответа.
 */
const ACCOUNT_EXISTS = "account_exists";

/** Ошибка создания сотрудника; занятый email ведёт к приглашениям. */
export function CreateEmployeeError({ error }: { error: Error }) {
    const t = useTranslations("crm.employees.create");
    const toAppPath = useLocalizedLink();
    const emailTaken = getApiErrorCode(error) === ACCOUNT_EXISTS;

    return (
        <p role="alert" className="text-sm text-destructive">
            {emailTaken
                ? t.rich("emailTaken", {
                      link: (chunks) => (
                          <NextLink
                              href={toAppPath(ROUTES.CRM_SETTINGS_INVITATIONS)}
                              className="font-medium underline underline-offset-2"
                          >
                              {chunks}
                          </NextLink>
                      ),
                  })
                : getApiErrorMessage(error)}
        </p>
    );
}
