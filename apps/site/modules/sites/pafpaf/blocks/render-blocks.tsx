import type { PlanView } from "@/modules/entities/plan/model";
import type { Locale } from "@/modules/shared/config/locales";
import type { Page } from "@/payload-types";

import { FeatureGrid, QrDoor } from "./door-and-grid";
import { Hero } from "./hero";
import {
    Addons,
    ClubsMergeSection,
    Faq,
    FinalCta,
    LimitFlaskSection,
    PricingTable,
    PricingTeaser,
    PrivacyRolesSection,
} from "./sections";

interface RenderBlocksProps {
    blocks: NonNullable<Page["layout"]>;
    locale: Locale;
    plans: PlanView[];
}

export const RenderBlocks = ({ blocks, locale, plans }: RenderBlocksProps) =>
    blocks.map((block, index) => {
        const key = block.id ?? `${block.blockType}-${index}`;
        switch (block.blockType) {
            case "hero":
                return <Hero key={key} block={block} locale={locale} />;
            case "qrDoor":
                return <QrDoor key={key} block={block} />;
            case "featureGrid":
                return <FeatureGrid key={key} block={block} />;
            case "limitFlask":
                return <LimitFlaskSection key={key} block={block} />;
            case "clubsMerge":
                return <ClubsMergeSection key={key} block={block} />;
            case "privacyRoles":
                return <PrivacyRolesSection key={key} block={block} />;
            case "pricingTeaser":
                return <PricingTeaser key={key} block={block} plans={plans} locale={locale} />;
            case "pricingTable":
                return <PricingTable key={key} block={block} plans={plans} />;
            case "addons":
                return <Addons key={key} block={block} />;
            case "faq":
                return <Faq key={key} block={block} />;
            case "finalCta":
                return <FinalCta key={key} block={block} locale={locale} />;
            default:
                return null;
        }
    });
