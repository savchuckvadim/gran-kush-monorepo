"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Palette } from "lucide-react";

import { SKINS } from "@/modules/shared/config/skins";

import { useSkin } from "./use-skin";

const BUTTON =
    "grid size-9 place-items-center rounded-full border border-border bg-card/60 text-foreground transition-colors hover:bg-accent";

/** A palette icon that opens four swatches, one per CRM skin; the active one wears a ring. */
export const PaletteMenu = () => {
    const t = useTranslations("skins");
    const { skin, setSkin } = useSkin();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelId = useId();

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-haspopup="true"
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={t("palette")}
                title={t("palette")}
                onClick={() => setOpen((value) => !value)}
                className={BUTTON}
            >
                <Palette className="size-4" />
            </button>
            {open ? (
                <div
                    id={panelId}
                    role="radiogroup"
                    aria-label={t("palette")}
                    className="surface absolute top-full right-0 z-40 mt-2 flex gap-2 p-2"
                >
                    {SKINS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            role="radio"
                            aria-checked={skin === item.id}
                            aria-label={t(item.id)}
                            title={t(item.id)}
                            onClick={() => {
                                setSkin(item.id);
                                setOpen(false);
                            }}
                            data-skin={item.id}
                            className={[
                                "swatch size-7 rounded-full border transition-transform hover:scale-110",
                                item.modes[0] === "dark" ? "dark" : "",
                                skin === item.id
                                    ? "border-transparent ring-2 ring-ring ring-offset-2 ring-offset-card"
                                    : "border-border",
                            ].join(" ")}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
};
