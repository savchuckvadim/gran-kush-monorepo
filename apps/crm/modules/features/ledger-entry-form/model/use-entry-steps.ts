"use client";

import { useCallback, useEffect, useState } from "react";

import type { FieldErrors, UseFormReturn } from "react-hook-form";

import { ENTRY_STEPS, type EntryStep, firstStepWithError, STEP_FIELDS } from "./entry-steps";
import { crossFieldIssues, type LedgerEntryFormValues } from "./ledger-entry-form";

type FieldName = keyof LedgerEntryFormValues;

/**
 * Шаги мастера проводки. Вперёд — только когда поля текущего шага верны; на пройденные шаги
 * можно вернуться кликом. После неудачного «Далее» поля шага перепроверяются на каждое изменение,
 * и исправленное поле сразу теряет ошибку. Правка открывает все шаги сразу: мастер — вкладки.
 */
export const useEntrySteps = (form: UseFormReturn<LedgerEntryFormValues>, editing: boolean) => {
    const [step, setStep] = useState<EntryStep>("basics");
    const [furthest, setFurthest] = useState(0);
    const [checked, setChecked] = useState<EntryStep | null>(null);
    const index = ENTRY_STEPS.indexOf(step);
    const last = index === ENTRY_STEPS.length - 1;
    const reachable = editing ? ENTRY_STEPS : ENTRY_STEPS.slice(0, furthest + 1);

    const open = (target: EntryStep) => {
        setStep(target);
        setFurthest((value) => Math.max(value, ENTRY_STEPS.indexOf(target)));
    };

    const fieldsAreValid = useCallback(
        async (fields: readonly FieldName[]): Promise<boolean> => {
            const valid = await form.trigger(fields);
            const issues = crossFieldIssues(form.getValues()).filter((issue) =>
                fields.includes(issue.path)
            );
            for (const issue of issues) {
                form.setError(issue.path, { type: "custom", message: issue.message });
            }
            return valid && issues.length === 0;
        },
        [form]
    );

    useEffect(() => {
        if (!checked) return;
        const fields = STEP_FIELDS[checked];
        const subscription = form.watch((_values, { name }) => {
            const changed = fields.find((field) => field === name);
            if (changed) void fieldsAreValid([changed]);
        });
        return () => subscription.unsubscribe();
    }, [checked, form, fieldsAreValid]);

    const stepIsValid = async (current: EntryStep): Promise<boolean> => {
        const valid = await fieldsAreValid(STEP_FIELDS[current]);
        if (!valid) setChecked(current);
        return valid;
    };

    const goTo = async (target: EntryStep) => {
        const forward = ENTRY_STEPS.indexOf(target) > index;
        if (forward && !editing && !(await stepIsValid(step))) return;
        open(target);
    };

    const next = async () => {
        const following = ENTRY_STEPS[index + 1];
        if (following) await goTo(following);
    };

    const back = () => {
        const previous = ENTRY_STEPS[index - 1];
        if (previous) setStep(previous);
    };

    /** Запись не прошла проверку: открыть первый шаг с ошибкой. */
    const showErrors = (errors: FieldErrors<LedgerEntryFormValues>) => {
        const target = firstStepWithError(Object.keys(errors));
        if (target) setStep(target);
    };

    const restart = useCallback(() => {
        setStep("basics");
        setFurthest(0);
        setChecked(null);
    }, []);

    return {
        step,
        index,
        total: ENTRY_STEPS.length,
        last,
        reachable,
        goTo,
        next,
        back,
        showErrors,
        restart,
    };
};

export type EntrySteps = ReturnType<typeof useEntrySteps>;
