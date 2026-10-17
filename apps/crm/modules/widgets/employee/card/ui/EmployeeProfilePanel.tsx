"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui/components/card";

import { type Employee, EMPLOYEE_FIELD, employeeFieldText } from "@/modules/entities/employee";
import { fieldValueText } from "@/modules/shared/lib/field-value-text";
import { useDateFormat, useDateTimeFormat } from "@/modules/shared/lib/use-date-format";
import { Fact, FactGroup } from "@/modules/shared/ui/Fact";

/** Поля, которые карточка уже показывает строками групп и героем. */
const SHOWN_FIELD_KEYS: ReadonlySet<string> = new Set(Object.values(EMPLOYEE_FIELD));

/** Профиль сотрудника: контакты, работа, аккаунт и свои поля клуба. */
export function EmployeeProfilePanel({ employee }: { employee: Employee }) {
    const t = useTranslations("crm.employees.card.profile");
    const date = useDateFormat();
    const dateTime = useDateTimeFormat();
    const field = (fieldKey: string) => employeeFieldText(employee, fieldKey);

    const extra = employee.fields.filter(
        (item) => !SHOWN_FIELD_KEYS.has(item.fieldKey) && fieldValueText(item.value) !== null
    );

    return (
        <Card className="gap-5 px-4 md:px-5">
            <h2 className="text-base font-semibold">{t("title")}</h2>

            <FactGroup title={t("contacts")}>
                <Fact label={t("email")} value={employee.email} />
                <Fact label={t("phone")} value={field(EMPLOYEE_FIELD.phone)} />
            </FactGroup>

            <FactGroup title={t("work")}>
                <Fact label={t("position")} value={field(EMPLOYEE_FIELD.position)} />
                <Fact label={t("department")} value={field(EMPLOYEE_FIELD.department)} />
            </FactGroup>

            <FactGroup title={t("account")}>
                {/* пустой вход — «не указано», а не «не входил»: API пока не отмечает входы сотрудников */}
                <Fact
                    label={t("lastLogin")}
                    value={employee.lastLoginAt ? dateTime(employee.lastLoginAt) : null}
                />
                <Fact label={t("joined")} value={date(employee.createdAt)} />
            </FactGroup>

            {extra.length > 0 && (
                <FactGroup title={t("extra")}>
                    {extra.map((item) => (
                        <Fact
                            key={item.fieldKey}
                            label={item.label ?? item.fieldKey}
                            value={fieldValueText(item.value)}
                        />
                    ))}
                </FactGroup>
            )}
        </Card>
    );
}
