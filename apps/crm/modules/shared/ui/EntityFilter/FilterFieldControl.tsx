"use client";

import { useTranslations } from "next-intl";

import { Input } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import type { EntityFilterField, EntityFilterRange, EntityFilterValue } from "./types";
import { isRange } from "./url-state";
import { useDebouncedText } from "./use-debounced-text";

interface FilterFieldControlProps {
    field: EntityFilterField;
    value: EntityFilterValue | undefined;
    onChange: (value: EntityFilterValue | undefined) => void;
}

/** A pill to press: options of a select, yes / no of a flag. */
function OptionPill({
    isOn,
    onClick,
    color,
    children,
}: {
    isOn: boolean;
    onClick: () => void;
    color?: string | null;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            data-slot="entity-filter-option"
            data-state={isOn ? "on" : "off"}
            aria-pressed={isOn}
            onClick={onClick}
            className={cn(
                "inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                isOn
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background/40 hover:bg-accent"
            )}
        >
            {color ? (
                <span
                    aria-hidden="true"
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                />
            ) : null}
            <span className="truncate">{children}</span>
        </button>
    );
}

function TextControl({ field, value, onChange }: FilterFieldControlProps) {
    const t = useTranslations("crm.entityFilter");
    const { draft, setDraft, flush } = useDebouncedText(
        typeof value === "string" ? value : "",
        (next) => onChange(next.trim() ? next : undefined)
    );
    return (
        <Input
            id={`entity-filter-${field.key}`}
            value={draft}
            placeholder={t("contains")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
                if (event.key === "Enter") flush();
            }}
        />
    );
}

function OptionsControl({ field, value, onChange }: FilterFieldControlProps) {
    const selected = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    const toggle = (option: string) => {
        if (field.type === "select") {
            onChange(selected[0] === option ? undefined : option);
            return;
        }
        const next = selected.includes(option)
            ? selected.filter((v) => v !== option)
            : [...selected, option];
        onChange(next.length > 0 ? next : undefined);
    };
    return (
        <div
            role="group"
            aria-labelledby={`entity-filter-${field.key}-label`}
            className="flex flex-wrap gap-1.5"
        >
            {(field.options ?? []).map((option) => (
                <OptionPill
                    key={option.value}
                    isOn={selected.includes(option.value)}
                    color={option.color}
                    onClick={() => toggle(option.value)}
                >
                    {option.label}
                </OptionPill>
            ))}
        </div>
    );
}

function BooleanControl({ field, value, onChange }: FilterFieldControlProps) {
    const t = useTranslations("crm.entityFilter");
    const choices: { label: string; value: boolean | undefined }[] = [
        { label: t("any"), value: undefined },
        { label: t("yes"), value: true },
        { label: t("no"), value: false },
    ];
    return (
        <div
            role="group"
            aria-labelledby={`entity-filter-${field.key}-label`}
            className="flex flex-wrap gap-1.5"
        >
            {choices.map((choice) => (
                <OptionPill
                    key={String(choice.value)}
                    isOn={value === choice.value}
                    onClick={() => onChange(choice.value)}
                >
                    {choice.label}
                </OptionPill>
            ))}
        </div>
    );
}

function NumberInput({
    id,
    value,
    placeholder,
    onCommit,
}: {
    id?: string;
    value: string;
    placeholder: string;
    onCommit: (next: string) => void;
}) {
    const { draft, setDraft, flush } = useDebouncedText(value, onCommit);
    return (
        <Input
            id={id}
            type="number"
            inputMode="decimal"
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
                if (event.key === "Enter") flush();
            }}
        />
    );
}

/** Typing a year, Chrome reports 0001, 0019, 0198 before 1985: only a full year applies. */
const isFullDate = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1000;

function DateInput({
    id,
    label,
    value,
    min,
    max,
    onCommit,
}: {
    id?: string;
    label: string;
    value: string;
    min?: string;
    max?: string;
    onCommit: (next: string) => void;
}) {
    const { draft, setDraft, flush } = useDebouncedText(
        value,
        (next) => {
            if (next === "" || isFullDate(next)) onCommit(next);
        },
        500
    );
    return (
        <Input
            id={id}
            type="date"
            aria-label={label}
            value={draft}
            min={min}
            max={max}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={flush}
            onKeyDown={(event) => {
                if (event.key === "Enter") flush();
            }}
        />
    );
}

function RangeControl({ field, value, onChange }: FilterFieldControlProps) {
    const t = useTranslations("crm.entityFilter");
    const range: EntityFilterRange = value !== undefined && isRange(value) ? value : {};
    const set = (patch: EntityFilterRange) => {
        const next = { ...range, ...patch };
        onChange(next.from || next.to ? next : undefined);
    };
    const fromId = `entity-filter-${field.key}`;

    if (field.type === "number") {
        return (
            <div className="grid grid-cols-2 gap-2">
                <NumberInput
                    id={fromId}
                    value={range.from ?? ""}
                    placeholder={t("from")}
                    onCommit={(from) => set({ from: from || undefined })}
                />
                <NumberInput
                    value={range.to ?? ""}
                    placeholder={t("to")}
                    onCommit={(to) => set({ to: to || undefined })}
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-2">
            <DateInput
                id={fromId}
                label={`${field.label}: ${t("from")}`}
                value={range.from ?? ""}
                max={range.to}
                onCommit={(from) => set({ from: from || undefined })}
            />
            <DateInput
                label={`${field.label}: ${t("to")}`}
                value={range.to ?? ""}
                min={range.from}
                onCommit={(to) => set({ to: to || undefined })}
            />
        </div>
    );
}

/** The control of one field in the filter panel, by the field's type. */
export function FilterFieldControl(props: FilterFieldControlProps) {
    switch (props.field.type) {
        case "text":
            return <TextControl {...props} />;
        case "select":
        case "multiselect":
            return <OptionsControl {...props} />;
        case "boolean":
            return <BooleanControl {...props} />;
        case "number":
        case "date":
            return <RangeControl {...props} />;
    }
}
