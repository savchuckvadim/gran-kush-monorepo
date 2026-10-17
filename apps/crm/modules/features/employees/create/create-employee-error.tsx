"use client";

import NextLink from "next/link";
import { useTranslations } from "next-intl";

import { ApiClientError, getApiErrorMessage } from "@workspace/api-client/core";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

/** У адреса уже есть аккаунт с владельцем: прикрепить его к клубу может только приглашение. */
const EMAIL_TAKEN_STATUS = 409;

/** Ошибка создания сотрудника; занятый email ведёт к приглашениям. */
export function CreateEmployeeError({ error }: { error: Error }) {
    const t = useTranslations("crm.employees.create");
    const toAppPath = useLocalizedLink();
    const emailTaken = error instanceof ApiClientError && error.status === EMAIL_TAKEN_STATUS;

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
