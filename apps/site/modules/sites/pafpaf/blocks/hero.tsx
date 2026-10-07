import { getTranslations } from "next-intl/server";

import type { Locale } from "@/modules/shared/config/locales";
import { resolveHref } from "@/modules/shared/config/routes";
import type { HeroBlock } from "@/payload-types";

import { LiquidButton } from "../ui/liquid-button";
import { SmokeText } from "../ui/smoke-text";

import { HeroLens, LiveBar } from "./hero-client";

export const Hero = async ({ block, locale }: { block: HeroBlock; locale: Locale }) => {
    const t = await getTranslations("live");
    return (
        <section className="hero" id="top">
            <video
                className="hero__video"
                autoPlay
                muted
                loop
                playsInline
                poster="/media/hero-smoke.jpg"
                src="/media/hero-smoke.mp4"
                aria-hidden="true"
            />
            <HeroLens />
            <div className="hero__inner wrap">
                {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
                <SmokeText as="h1" className="h1" text={block.title} now />
                {block.text && <p className="lede fade-late">{block.text}</p>}
                <div className="ctas fade-late">
                    {block.primary?.label && (
                        <LiquidButton
                            href={resolveHref(block.primary.href, locale)}
                            variant="primary"
                        >
                            {block.primary.label}
                        </LiquidButton>
                    )}
                    {block.secondary?.label && (
                        <LiquidButton href={resolveHref(block.secondary.href, locale)}>
                            {block.secondary.label}
                        </LiquidButton>
                    )}
                </div>
                {block.showLiveBar && (
                    <LiveBar
                        labels={{ inside: t("inside"), pickups: t("pickups"), cash: t("cash") }}
                    />
                )}
            </div>
            {block.hint && (
                <p className="hint" aria-hidden="true">
                    <i />
                    <span>{block.hint}</span>
                </p>
            )}
        </section>
    );
};
