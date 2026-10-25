"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Palette } from "lucide-react";

import { SKINS } from "@/modules/shared/config/skins";

import { HEADER_POPOVER, ICON_BUTTON } from "./icon-button";
import { useDismiss } from "./use-dismiss";
import { useSkin } from "./use-skin";

/** A palette icon that opens four gradient swatches, one per CRM skin; the active one wears a ring. */
export const PaletteMenu = () => {
    const t = useTranslations("skins");
    const { skin, setSkin } = useSkin();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelId = useId();
    const close = useCallback(() => setOpen(false), []);

    const refs = useMemo(() => [rootRef], []);
    useDismiss(open, close, refs);

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
                className={ICON_BUTTON}
            >
                <Palette className="size-4" />
            </button>
            {open ? (
                <div
                    id={panelId}
                    role="radiogroup"
                    aria-label={t("palette")}
                    className={`${HEADER_POPOVER} flex gap-2 p-2`}
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
                                close();
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
