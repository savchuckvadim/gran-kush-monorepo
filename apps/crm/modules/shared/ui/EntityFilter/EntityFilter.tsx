"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";

import {
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Popover,
    PopoverAnchor,
    PopoverContent,
    PopoverTrigger,
} from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useIsMobile } from "../../lib/use-is-mobile";

import { FieldPicker } from "./FieldPicker";
import { FilterFieldControl } from "./FilterFieldControl";
import type { EntityFilterField, EntityFilterState, EntityFilterValue } from "./types";
import { activeFieldKeys, EMPTY_FILTER, isEmptyValue, isRange } from "./url-state";
import { useDebouncedText } from "./use-debounced-text";
import { useVisibleFields } from "./use-visible-fields";

export interface EntityFilterProps {
    fields: EntityFilterField[];
    state: EntityFilterState;
    onChange: (next: EntityFilterState) => void;
    /** Records found; `undefined` until the first page arrives. */
    total?: number;
    isFetching?: boolean;
    /** Remembers the viewer's pick of fields in this browser. */
    storageKey: string;
    searchPlaceholder?: string;
    className?: string;
}

// the dialog primitive restyled as a bottom sheet; packages/ui has no sheet yet
const SHEET_CLASS =
    "top-auto bottom-0 left-0 max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 gap-0 rounded-t-2xl rounded-b-none border-x-0 border-b-0 p-0 sm:max-w-none data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100";

const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function useSummary() {
    const t = useTranslations("crm.entityFilter");
    const locale = useLocale();
    const dateFormat = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    return (field: EntityFilterField, value: EntityFilterValue): string => {
        if (typeof value === "boolean") return value ? t("yes") : t("no");
        if (Array.isArray(value) || field.type === "select") {
            const values = Array.isArray(value) ? value : [value as string];
            const labels = values.map(
                (v) => field.options?.find((option) => option.value === v)?.label ?? v
            );
            return labels.length > 2
                ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`
                : labels.join(", ");
        }
        if (isRange(value)) {
            const show = (raw: string) =>
                field.type === "date" ? dateFormat.format(new Date(`${raw}T00:00:00`)) : raw;
            if (value.from && value.to) return `${show(value.from)} – ${show(value.to)}`;
            return value.from ? `≥ ${show(value.from)}` : `≤ ${show(value.to ?? "")}`;
        }
        return `«${value}»`;
    };
}

interface PanelProps {
    fields: EntityFilterField[];
    visible: EntityFilterField[];
    state: EntityFilterState;
    total?: number;
    isSheet: boolean;
    onValue: (key: string, value: EntityFilterValue | undefined) => void;
    onToggleField: (key: string) => void;
    onReset: () => void;
    onDone: () => void;
}

function FilterPanel({
    fields,
    visible,
    state,
    total,
    isSheet,
    onValue,
    onToggleField,
    onReset,
    onDone,
}: PanelProps) {
    const t = useTranslations("crm.entityFilter");
    const hasValues = activeFieldKeys(state, fields).length > 0 || state.q.trim() !== "";

    return (
        <div
            className={cn(
                "flex min-h-0 flex-col",
                isSheet ? "max-h-[88dvh]" : "max-h-[min(70vh,36rem)]"
            )}
        >
            <div className="flex items-center gap-1 border-b py-2 pr-2 pl-4">
                {isSheet ? (
                    <DialogTitle className="text-sm font-semibold">{t("panelTitle")}</DialogTitle>
                ) : (
                    <h2 className="text-sm font-semibold">{t("panelTitle")}</h2>
                )}
                <div className="ml-auto flex items-center gap-1">
                    <FieldPicker
                        fields={fields}
                        visibleKeys={visible.map((field) => field.key)}
                        onToggle={onToggleField}
                    />
                    <Button variant="ghost" size="sm" disabled={!hasValues} onClick={onReset}>
                        {t("reset")}
                    </Button>
                </div>
            </div>

            <div className="grid min-h-0 flex-1 content-start gap-x-6 gap-y-4 overflow-y-auto p-4 sm:grid-cols-2">
                {visible.map((field) => {
                    const isWide =
                        (field.type === "select" || field.type === "multiselect") &&
                        (field.options?.length ?? 0) > 4;
                    return (
                        <div
                            key={field.key}
                            className={cn("min-w-0 space-y-1.5", isWide && "sm:col-span-2")}
                        >
                            <label
                                id={`entity-filter-${field.key}-label`}
                                htmlFor={`entity-filter-${field.key}`}
                                className="text-muted-foreground block text-xs font-medium"
                            >
                                {field.label}
                            </label>
                            <FilterFieldControl
                                field={field}
                                value={state.values[field.key]}
                                onChange={(value) => onValue(field.key, value)}
                            />
                        </div>
                    );
                })}
                {visible.length === 0 && (
                    <p className="text-muted-foreground text-sm sm:col-span-2">{t("noFields")}</p>
                )}
            </div>

            <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
                <span className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
                    {total !== undefined ? t("found", { count: total }) : null}
                </span>
                <Button size="sm" onClick={onDone}>
                    {isSheet && total !== undefined ? t("show", { count: total }) : t("done")}
                </Button>
            </div>
        </div>
    );
}

/**
 * The filter of an entity list (after Bitrix24's `main.ui.filter`): one line with the search and
 * the chosen conditions as chips; the fields open in a panel under it, as a sheet on a phone.
 * Conditions apply at once, the count of found records stands in the line.
 */
export function EntityFilter({
    fields,
    state,
    onChange,
    total,
    isFetching,
    storageKey,
    searchPlaceholder,
    className,
}: EntityFilterProps) {
    const t = useTranslations("crm.entityFilter");
    const summary = useSummary();
    const isPhone = useIsMobile("(max-width: 639px)");
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const active = activeFieldKeys(state, fields);
    const { visible, toggle } = useVisibleFields(storageKey, fields, active);
    const fieldByKey = new Map(fields.map((field) => [field.key, field]));
    const hasAnything = active.length > 0 || state.q.trim() !== "";

    const search = useDebouncedText(state.q, (q) => onChange({ ...state, q }));

    const setValue = (key: string, value: EntityFilterValue | undefined) => {
        const values = { ...state.values };
        if (value === undefined || isEmptyValue(value)) delete values[key];
        else values[key] = value;
        onChange({ ...state, values });
    };

    const toggleField = (key: string) => {
        // a field taken out of the panel stops filtering
        if (active.includes(key)) setValue(key, undefined);
        toggle(key);
    };

    const reset = () => onChange(EMPTY_FILTER);

    useEffect(() => {
        const focusSearch = (event: KeyboardEvent) => {
            if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
            if (isTyping(event.target)) return;
            event.preventDefault();
            inputRef.current?.focus();
        };
        window.addEventListener("keydown", focusSearch);
        return () => window.removeEventListener("keydown", focusSearch);
    }, []);

    const panel = (isSheet: boolean) => (
        <FilterPanel
            fields={fields}
            visible={visible}
            state={state}
            total={total}
            isSheet={isSheet}
            onValue={setValue}
            onToggleField={toggleField}
            onReset={reset}
            onDone={() => setIsOpen(false)}
        />
    );

    return (
        <div className={cn("min-w-0", className)}>
            <Popover open={isOpen && !isPhone} onOpenChange={setIsOpen}>
                <PopoverAnchor asChild>
                    <div
                        data-slot="entity-filter"
                        data-active={hasAnything ? "" : undefined}
                        className="flex h-11 w-full min-w-0 items-center gap-1 rounded-xl border pr-1 pl-3"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                event.preventDefault();
                                inputRef.current?.focus();
                            }
                        }}
                    >
                        <Search
                            aria-hidden="true"
                            className="text-muted-foreground size-4 shrink-0"
                        />
                        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
                            {active.map((key) => {
                                const field = fieldByKey.get(key);
                                const value = state.values[key];
                                if (!field || value === undefined) return null;
                                return (
                                    <span
                                        key={key}
                                        data-slot="entity-filter-chip"
                                        className="bg-accent text-accent-foreground inline-flex h-7 max-w-56 shrink-0 items-center gap-0.5 rounded-full pr-0.5 pl-2.5 text-xs"
                                    >
                                        <button
                                            type="button"
                                            className="min-w-0 truncate outline-none focus-visible:underline"
                                            onClick={() => setIsOpen(true)}
                                        >
                                            <span className="opacity-70">{field.label}:</span>{" "}
                                            {summary(field, value)}
                                        </button>
                                        <button
                                            type="button"
                                            aria-label={t("removeChip", { label: field.label })}
                                            className="hover:bg-background/60 rounded-full p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                            onClick={() => setValue(key, undefined)}
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                );
                            })}
                            <input
                                ref={inputRef}
                                type="search"
                                data-slot="entity-filter-input"
                                value={search.draft}
                                placeholder={
                                    active.length > 0
                                        ? undefined
                                        : (searchPlaceholder ?? t("searchPlaceholder"))
                                }
                                aria-label={t("searchLabel")}
                                className="placeholder:text-muted-foreground h-9 min-w-28 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:hidden"
                                onChange={(event) => search.setDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") search.flush();
                                    if (event.key === "ArrowDown") setIsOpen(true);
                                    if (event.key === "Escape") event.currentTarget.blur();
                                    const last = active.at(-1);
                                    if (event.key === "Backspace" && search.draft === "" && last) {
                                        setValue(last, undefined);
                                    }
                                }}
                            />
                        </div>

                        {total !== undefined && (
                            <span
                                data-slot="entity-filter-total"
                                aria-live="polite"
                                className="text-muted-foreground flex shrink-0 items-center gap-1 px-1 text-xs tabular-nums"
                            >
                                {isFetching ? <Loader2 className="size-3 animate-spin" /> : null}
                                <span className="hidden sm:inline">
                                    {t("found", { count: total })}
                                </span>
                                <span className="sm:hidden">{total}</span>
                            </span>
                        )}
                        {!hasAnything && (
                            <kbd className="bg-muted text-muted-foreground pointer-events-none hidden rounded border px-1.5 py-0.5 font-mono text-[0.625rem] md:inline">
                                /
                            </kbd>
                        )}
                        {hasAnything && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t("reset")}
                                title={t("reset")}
                                onClick={reset}
                            >
                                <X />
                            </Button>
                        )}
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                data-slot="entity-filter-toggle"
                                aria-label={t("openFilters")}
                                className="shrink-0"
                            >
                                <SlidersHorizontal />
                                <span className="hidden sm:inline">{t("filters")}</span>
                                {active.length > 0 && (
                                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[0.625rem] leading-4 font-semibold tabular-nums">
                                        {active.length}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                    </div>
                </PopoverAnchor>
                <PopoverContent
                    align="start"
                    sideOffset={8}
                    data-slot="entity-filter-panel"
                    className="w-(--radix-popover-trigger-width) p-0"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                >
                    {panel(false)}
                </PopoverContent>
            </Popover>

            {isPhone && (
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent
                        data-slot="entity-filter-panel"
                        showCloseButton={false}
                        className={SHEET_CLASS}
                        aria-describedby={undefined}
                    >
                        {panel(true)}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
