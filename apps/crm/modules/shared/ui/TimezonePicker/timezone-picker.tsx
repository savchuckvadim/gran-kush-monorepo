"use client";

import { useMemo, useState } from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import {
    Button,
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { PICKER_COMMAND_CLASS } from "../picker-command-class";

interface TimezonePickerProps {
    id?: string;
    value: string;
    onChange: (timezone: string) => void;
    disabled?: boolean;
    labels: { search: string; empty: string };
}

/** Смещение пояса сейчас, `GMT+2`: по нему проще узнать свой пояс, чем по названию. */
const offsetOf = (timeZone: string, now: Date): string =>
    new Intl.DateTimeFormat("en", { timeZone, timeZoneName: "shortOffset" })
        .formatToParts(now)
        .find((part) => part.type === "timeZoneName")?.value ?? "";

/**
 * Выбор часового пояса IANA с поиском по названию (`Madrid`, `Europe/`). Список — всё, что знает
 * браузер; сохранённый пояс, которого в нём нет, остаётся первым, чтобы не потеряться.
 */
export function TimezonePicker({ id, value, onChange, disabled, labels }: TimezonePickerProps) {
    const [open, setOpen] = useState(false);

    const zones = useMemo(() => {
        if (!open) return [];
        const now = new Date();
        const known = Intl.supportedValuesOf("timeZone");
        const all = known.includes(value) ? known : [value, ...known];
        return all.map((zone) => ({ zone, offset: offsetOf(zone, now) }));
    }, [open, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className="w-full justify-between font-normal sm:w-80"
                >
                    <span className="truncate">{value}</span>
                    <ChevronsUpDown className="opacity-50" aria-hidden="true" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
                <Command className={PICKER_COMMAND_CLASS}>
                    <CommandInput placeholder={labels.search} />
                    <CommandList>
                        <CommandEmpty>{labels.empty}</CommandEmpty>
                        {zones.map(({ zone, offset }) => (
                            <CommandItem
                                key={zone}
                                value={zone}
                                keywords={[zone.replaceAll("_", " "), offset]}
                                onSelect={() => {
                                    onChange(zone);
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(zone === value ? "opacity-100" : "opacity-0")}
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 flex-1 truncate">{zone}</span>
                                <span className="text-xs text-muted-foreground">{offset}</span>
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
