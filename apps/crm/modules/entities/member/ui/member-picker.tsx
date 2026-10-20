"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ChevronsUpDown, UserRound } from "lucide-react";

import {
    Button,
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
    Field,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@workspace/ui";

import { personName, useDebouncedValue } from "@/modules/shared";
import { PICKER_COMMAND_CLASS } from "@/modules/shared/ui/picker-command-class";

import { useCrmMembers } from "../hooks";
import {
    MEMBER_SEARCH_DEBOUNCE_MS,
    type MemberChoice,
    toMemberChoice,
} from "../model/member-choice";

import { MemberChoiceLabel } from "./member-choice-label";

const RESULTS = 8;

interface MemberPickerProps {
    label: string;
    value: MemberChoice | null;
    onChange: (member: MemberChoice) => void;
    required?: boolean;
    error?: string;
    disabled?: boolean;
}

/** Поиск участника клуба по имени, почте или номеру; неактивного выбрать нельзя. */
export function MemberPicker({
    label,
    value,
    onChange,
    required,
    error,
    disabled,
}: MemberPickerProps) {
    const t = useTranslations("crm.memberPicker");
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const q = useDebouncedValue(query.trim(), MEMBER_SEARCH_DEBOUNCE_MS);
    const members = useCrmMembers({ page: 1, limit: RESULTS, q }, { enabled: open });
    const items = members.data?.items ?? [];

    return (
        <Field label={label} required={required} error={error}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        aria-invalid={error ? true : undefined}
                        disabled={disabled}
                        className="w-full justify-between font-normal"
                    >
                        {value ? (
                            <MemberChoiceLabel
                                name={value.name}
                                email={value.email}
                                className="flex min-w-0 items-baseline gap-2"
                            />
                        ) : (
                            <span className="text-muted-foreground">{t("placeholder")}</span>
                        )}
                        <ChevronsUpDown className="size-4 opacity-50" aria-hidden="true" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    align="start"
                    className="w-(--radix-popover-trigger-width) min-w-72 p-0"
                >
                    <Command shouldFilter={false} className={PICKER_COMMAND_CLASS}>
                        <CommandInput
                            value={query}
                            onValueChange={setQuery}
                            placeholder={t("search")}
                        />
                        <CommandList>
                            {members.isLoading && (
                                <p className="px-3 py-3 text-sm text-muted-foreground">
                                    {t("searching")}
                                </p>
                            )}
                            {members.isSuccess && items.length === 0 && (
                                <CommandEmpty>{t("empty")}</CommandEmpty>
                            )}
                            {items.map((member) => (
                                <CommandItem
                                    key={member.id}
                                    value={member.id}
                                    disabled={!member.isActive}
                                    onSelect={() => {
                                        onChange(toMemberChoice(member));
                                        setOpen(false);
                                    }}
                                >
                                    <UserRound />
                                    <MemberChoiceLabel
                                        name={personName(member, "")}
                                        email={member.email}
                                        className="min-w-0 flex-1 [&>span]:block"
                                    />
                                    {!member.isActive && (
                                        <span className="text-xs text-muted-foreground">
                                            {t("inactive")}
                                        </span>
                                    )}
                                </CommandItem>
                            ))}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </Field>
    );
}
