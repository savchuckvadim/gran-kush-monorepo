import type { PlanView } from "@/modules/entities/plan/model";
import type { Locale } from "@/modules/shared/config/locales";
import { resolveHref } from "@/modules/shared/config/routes";
import type {
    AddonsBlock,
    ClubsMergeBlock,
    FaqBlock,
    FinalCtaBlock,
    LimitFlaskBlock,
    PricingTableBlock,
    PricingTeaserBlock,
    PrivacyRolesBlock,
} from "@/payload-types";

import { LiquidButton } from "../ui/liquid-button";
import { SmokeText } from "../ui/smoke-text";

import { LimitFlask, Metaballs, RolesRecord } from "./interactive";
import { PricingCalculator, PricingTeaserPlans } from "./pricing";

interface IntroProps {
    eyebrow?: string | null;
    title: string;
    text?: string | null;
}

const Intro = ({ eyebrow, title, text }: IntroProps) => (
    <>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <SmokeText className="h2" text={title} />
        {text && <p className="lede reveal">{text}</p>}
    </>
);

export const LimitFlaskSection = ({ block }: { block: LimitFlaskBlock }) => (
    <section className="sec">
        <div className="wrap split split--flip slots">
            <div className="slots__copy">
                <Intro eyebrow={block.eyebrow} title={block.title} text={block.text} />
            </div>
            <LimitFlask
                used={block.used ?? 41}
                limit={block.limit ?? 60}
                maxDraw={block.maxDraw ?? 30}
            />
        </div>
    </section>
);

export const ClubsMergeSection = ({ block }: { block: ClubsMergeBlock }) => (
    <section className="sec">
        <div className="wrap split">
            <div>
                <Intro eyebrow={block.eyebrow} title={block.title} text={block.text} />
            </div>
            <div className="vis">
                <Metaballs
                    clubs={(block.clubs ?? []).map((club) => club.name)}
                    merged={block.merged || "PafPaf"}
                />
            </div>
        </div>
    </section>
);

export const PrivacyRolesSection = ({ block }: { block: PrivacyRolesBlock }) => (
    <section className="sec" id={block.anchor || undefined}>
        <div className="wrap split split--flip slots">
            <div className="slots__copy">
                <Intro eyebrow={block.eyebrow} title={block.title} text={block.text} />
            </div>
            <RolesRecord />
        </div>
    </section>
);

export const PricingTeaser = ({
    block,
    plans,
    locale,
}: {
    block: PricingTeaserBlock;
    plans: PlanView[];
    locale: Locale;
}) => (
    <section className="sec center">
        <div className="wrap">
            <Intro eyebrow={block.eyebrow} title={block.title} text={block.text} />
            <PricingTeaserPlans plans={plans} />
            {block.cta?.label && (
                <div className="ctas">
                    <LiquidButton href={resolveHref(block.cta.href, locale)} variant="primary">
                        {block.cta.label}
                    </LiquidButton>
                </div>
            )}
        </div>
    </section>
);

export const PricingTable = ({ block, plans }: { block: PricingTableBlock; plans: PlanView[] }) => (
    <section className="sec center p-hero">
        <div className="wrap">
            {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
            <SmokeText as="h1" className="h1 p-hero__h" text={block.title} now />
            {block.text && (
                <p className="lede fade-late" style={{ marginLeft: "auto", marginRight: "auto" }}>
                    {block.text}
                </p>
            )}
            <PricingCalculator plans={plans} defaultMembers={block.defaultMembers ?? 400} />
        </div>
    </section>
);

export const Addons = ({ block }: { block: AddonsBlock }) => (
    <section className="sec">
        <div className="wrap">
            {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
            <SmokeText className="h2" text={block.title} />
            <div className="addons">
                {(block.items ?? []).map((item, index) => (
                    <div
                        key={item.id ?? index}
                        className={`addon glass reveal${index % 2 ? " d1" : ""}`}
                    >
                        <div>
                            <b>{item.title}</b>
                            {item.subtitle && <small>{item.subtitle}</small>}
                        </div>
                        <span>{item.price}</span>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

export const Faq = ({ block }: { block: FaqBlock }) => (
    <section className="sec">
        <div className="wrap">
            {block.eyebrow && <span className="eyebrow">{block.eyebrow}</span>}
            <SmokeText className="h2" text={block.title} />
            <div className="drops">
                {(block.items ?? []).map((item, index) => (
                    <details key={item.id ?? index} className="drop glass reveal">
                        <summary>{item.question}</summary>
                        <p>{item.answer}</p>
                    </details>
                ))}
            </div>
        </div>
    </section>
);

export const FinalCta = ({ block, locale }: { block: FinalCtaBlock; locale: Locale }) => (
    <section className="final">
        <div className="wrap center">
            <SmokeText className="h1 final__h" text={block.title} />
            {block.text && (
                <p className="lede reveal" style={{ marginLeft: "auto", marginRight: "auto" }}>
                    {block.text}
                </p>
            )}
            {block.cta?.label && (
                <div className="ctas">
                    <LiquidButton href={resolveHref(block.cta.href, locale)} variant="primary">
                        {block.cta.label}
                    </LiquidButton>
                </div>
            )}
        </div>
    </section>
);
