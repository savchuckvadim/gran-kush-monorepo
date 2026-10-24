"use client";

import { useTranslations } from "next-intl";

import { SKINS } from "@/modules/shared/config/skins";

import { useSkin } from "./use-skin";

/** Four swatches, one per CRM skin; the active one wears a ring. */
export const SkinSwitch = () => {
    const t = useTranslations("skins");
    const { skin, setSkin } = useSkin();

    return (
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label={t("label")}>
            {SKINS.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={skin === item.id}
                    aria-label={t(item.id)}
                    title={t(item.id)}
                    onClick={() => setSkin(item.id)}
                    data-skin={item.id}
                    className={[
                        "size-5 rounded-full border transition-transform hover:scale-110",
                        "bg-[linear-gradient(135deg,var(--background)_50%,var(--primary)_50%)]",
                        skin === item.id
                            ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                            : "border-border",
                    ].join(" ")}
                />
            ))}
        </div>
    );
};
