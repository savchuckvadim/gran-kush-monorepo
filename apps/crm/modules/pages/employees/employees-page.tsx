"use client";

import { useTranslations } from "next-intl";

import { usePermissions } from "@/modules/entities/access";
import { CreateEmployeeForm } from "@/modules/features/employees";
import { ListPage } from "@/modules/shared/ui/ListPage";
import { EmployeesList } from "@/modules/widgets/employee";

/** Сотрудники клуба: список и «Добавить сотрудника» — для администратора. */
export function EmployeesPage() {
    const t = useTranslations("crm.employees");
    const { can } = usePermissions();
    const canManage = can("employees.manage");

    return (
        <ListPage
            title={t("title")}
            description={t("subtitle")}
            create={
                canManage
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
