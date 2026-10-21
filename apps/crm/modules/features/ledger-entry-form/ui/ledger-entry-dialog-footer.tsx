"use client";

import { useTranslations } from "next-intl";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@workspace/ui";

import type { EntrySteps } from "../model/use-entry-steps";

interface LedgerEntryDialogFooterProps {
    steps: EntrySteps;
    /** Правка: шаги — вкладки, «Записать» доступна на любом */
    editing: boolean;
    pending: boolean;
    formId: string;
    onCancel: () => void;
}

/** Назад · Отмена · Далее или Записать: записать новую проводку можно только с последнего шага. */
export function LedgerEntryDialogFooter({
    steps,
    editing,
    pending,
    formId,
    onCancel,
}: LedgerEntryDialogFooterProps) {
    const t = useTranslations("crm.finance.entryForm");
    const saveHere = editing || steps.last;

    return (
        <>
            {!editing && steps.index > 0 && (
                <Button
                    type="button"
                    variant="ghost"
                    className="sm:mr-auto"
                    onClick={steps.back}
                    disabled={pending}
                >
                    <ArrowLeft aria-hidden="true" />
                    {t("back")}
                </Button>
            )}
            <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
                {t("cancel")}
            </Button>
            {/* Разные key: иначе React превратит нажатую «Далее» в submit прямо в этом клике,
                и последний шаг запишется, не открывшись */}
            {saveHere ? (
                <Button key="save" type="submit" form={formId} disabled={pending}>
                    {pending ? t("saving") : t("save")}
                </Button>
            ) : (
                <Button
                    key="next"
                    type="button"
                    onClick={(event) => {
                        event.preventDefault();
                        void steps.next();
                    }}
                    disabled={pending}
                >
                    {t("next")}
                    <ArrowRight aria-hidden="true" />
                </Button>
            )}
        </>
    );
}
