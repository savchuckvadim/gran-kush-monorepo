"use client";

import { cn } from "@workspace/ui/lib/utils";

import { SKINS } from "@/modules/shared/config/skins";
import { useSkin } from "@/modules/shared/providers/skin-provider";

import { SkinCard } from "./skin-card";
import { usePreferredMode } from "./use-preferred-mode";

export function SkinGallery({ className }: { className?: string }) {
    const { skin, setSkin } = useSkin();
    const preferredMode = usePreferredMode();

    return (
        <div className={cn("grid gap-3", className)}>
            {SKINS.map((definition) => (
                <SkinCard
                    key={definition.id}
                    skin={definition}
                    selected={definition.id === skin}
                    preferredMode={preferredMode}
                    onSelect={setSkin}
                />
            ))}
        </div>
    );
}
