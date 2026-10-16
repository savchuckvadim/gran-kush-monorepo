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

import { useCrmMembers } from "@/modules/entities/member";
import { personName, useDebouncedValue } from "@/modules/shared";
import { PICKER_COMMAND_CLASS } from "@/modules/shared/ui/picker-command-class";

import type { DraftMember } from "../model/order-draft";

import { PICKER_DEBOUNCE_MS } from "./picker-command";

const RESULTS = 8;

/** A member without a name is shown by email alone, not by the email twice. */
export const toDraftMember = (member: {
    id: string;
    name: string;
    surname?: string | null;
    email?: string | null;
    isActive: boolean;
}): DraftMember => ({
    id: member.id,
    name: personName(member, ""),
    email: member.email,
    isActive: member.isActive,
});

const MemberLabel = ({
    name,
    email,
    className,
}: {
    name: string;
    email?: string | null;
    className?: string;
}) => (
    <span className={className}>
        <span className="truncate">{name || email}</span>
        {name && email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
    </span>
);

interface MemberPickerProps {
    value: DraftMember | null;
    onChange: (member: DraftMember) => void;
    error?: string;
    disabled?: boolean;
}

/** Search a member of the club by name, email or number; an inactive one cannot order. */
export function MemberPicker({ value, onChange, error, disabled }: MemberPickerProps) {
    const t = useTranslations("crm.orders.create");
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const q = useDebouncedValue(query.trim(), PICKER_DEBOUNCE_MS);
    const members = useCrmMembers({ page: 1, limit: RESULTS, q }, { enabled: open });
    const items = members.data?.items ?? [];

    return (
        <Field label={t("member")} required error={error}>
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
                            <MemberLabel
                                name={value.name}
                                email={value.email}
                                className="flex min-w-0 items-baseline gap-2"
                            />
                        ) : (
                            <span className="text-muted-foreground">{t("memberPlaceholder")}</span>
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
                            placeholder={t("memberSearch")}
                        />
                        <CommandList>
                            {members.isLoading && (
                                <p className="px-3 py-3 text-sm text-muted-foreground">
                                    {t("searching")}
                                </p>
                            )}
                            {members.isSuccess && items.length === 0 && (
                                <CommandEmpty>{t("memberEmpty")}</CommandEmpty>
                            )}
                            {items.map((member) => (
                                <CommandItem
                                    key={member.id}
                                    value={member.id}
                                    disabled={!member.isActive}
                                    onSelect={() => {
                                        onChange(toDraftMember(member));
                                        setOpen(false);
                                    }}
                                >
                                    <UserRound />
                                    <MemberLabel
                                        name={personName(member, "")}
                                        email={member.email}
                                        className="min-w-0 flex-1 [&>span]:block"
                                    />
                                    {!member.isActive && (
                                        <span className="text-xs text-muted-foreground">
                                            {t("memberInactive")}
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
