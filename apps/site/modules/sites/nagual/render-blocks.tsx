import type { PlanView } from "@/modules/entities/plan/model";
import type { Locale } from "@/modules/shared/config/locales";
import type { Page } from "@/payload-types";

interface RenderBlocksProps {
    blocks: NonNullable<Page["layout"]>;
    locale: Locale;
    plans: PlanView[];
}

export const RenderBlocks = ({ blocks }: RenderBlocksProps) =>
    blocks.map((block, index) => (
        <section key={block.id ?? index} className="nagual__section">
            <h2>{block.title}</h2>
        </section>
    ));
