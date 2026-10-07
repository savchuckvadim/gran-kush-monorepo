"use client";

import { cn } from "@workspace/ui/lib/utils";

import {
    DEFAULT_SKIN,
    getEffectiveMode,
    type SkinDefinition,
    type SkinId,
    type SkinMode,
} from "@/modules/shared/config/skins";

import { SkinPreview } from "./skin-preview";
import { useSkinText } from "./use-skin-text";

interface SkinCardProps {
    skin: SkinDefinition;
    selected: boolean;
    preferredMode: SkinMode;
    onSelect: (skin: SkinId) => void;
}

function Tag({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
    return (
        <span
            className={cn(
                "rounded-full px-1.5 py-px font-mono text-[0.64rem] font-semibold tracking-wide uppercase",
                strong ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
        >
            {children}
        </span>
    );
}

export function SkinCard({ skin, selected, preferredMode, onSelect }: SkinCardProps) {
    const text = useSkinText();

    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(skin.id)}
            className={cn(
                "grid w-full cursor-pointer grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-xl border bg-card p-3 text-left text-card-foreground outline-none transition-colors sm:grid-cols-[118px_minmax(0,1fr)] sm:gap-3.5",
                "hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50",
                selected && "border-primary ring-1 ring-primary"
            )}
        >
            <SkinPreview skin={skin.id} mode={getEffectiveMode(skin, preferredMode)} />
            <span className="grid content-start gap-1">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                    {text.name(skin.id)}
                    {selected ? <Tag strong>{text.t("selected")}</Tag> : null}
                    {skin.id === DEFAULT_SKIN ? <Tag>{text.t("default")}</Tag> : null}
                </span>
                <span className="text-xs leading-snug text-muted-foreground">
                    {text.description(skin.id)}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                    {skin.tags.map((tag) => (
                        <Tag key={tag}>{text.tag(tag)}</Tag>
                    ))}
                    {skin.modes.length > 1 ? (
                        <Tag>{`${text.modeName(skin, "light")} / ${text.modeName(skin, "dark")}`}</Tag>
                    ) : null}
                </span>
            </span>
        </button>
    );
}
