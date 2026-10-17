"use client";

import { useTranslations } from "next-intl";

import { usePortalRole } from "@/modules/entities/portal";
import { CreateEmployeeForm } from "@/modules/features/employees";
import { ListPage } from "@/modules/shared/ui/ListPage";
import { EmployeesList } from "@/modules/widgets/employee";

/** Сотрудники клуба: список и «Добавить сотрудника» — для администратора. */
export function EmployeesPage() {
    const t = useTranslations("crm.employees");
    const { isAdmin } = usePortalRole();

    return (
        <ListPage
            title={t("title")}
            description={t("subtitle")}
            create={
                isAdmin
                    ? {
                          label: t("create.button"),
                          title: t("create.title"),
                          description: t("create.description"),
                          size: "xl",
                          form: ({ close }) => <CreateEmployeeForm onCreated={close} />,
                      }
                    : undefined
            }
        >
            <EmployeesList />
        </ListPage>
    );
}
