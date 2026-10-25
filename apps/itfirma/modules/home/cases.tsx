import { useTranslations } from "next-intl";

import { Reveal } from "@/modules/shared/ui/reveal";
import { SectionHeading } from "@/modules/shared/ui/section-heading";

/** Work the studio can describe without naming clients: `cases.items.<key>` in the messages. */
const CASES = ["sales", "studios", "kpi"] as const;
const COLUMNS = ["task", "solution", "result"] as const;

/** Three anonymised cases as rows: what was asked, what was built, what changed. */
export const Cases = () => {
    const t = useTranslations("cases");

    return (
        <section id="cases" className="scroll-mt-20 py-24 md:py-32">
            <div className="wrap">
                <SectionHeading title={t("title")} lead={t("lead")} />
                <div className="mt-14">
                    <div className="hidden grid-cols-[1.1fr_1fr_1fr_1fr] gap-8 border-b border-border pb-3 text-sm text-muted-foreground lg:grid">
                        <span>{t("labels.project")}</span>
                        {COLUMNS.map((column) => (
                            <span key={column}>{t(`labels.${column}`)}</span>
                        ))}
                    </div>
                    {CASES.map((item, index) => (
                        <Reveal
                            key={item}
                            className="grid gap-6 border-b border-border py-10 lg:grid-cols-[1.1fr_1fr_1fr_1fr] lg:gap-8"
                            delay={index * 80}
                        >
                            <div>
                                <p className="text-sm text-primary">{t(`items.${item}.sector`)}</p>
                                <h3 className="mt-2 text-2xl leading-tight md:text-3xl">
                                    {t(`items.${item}.name`)}
                                </h3>
                            </div>
                            {COLUMNS.map((column) => (
                                <div key={column}>
                                    <p className="mb-1.5 text-sm text-muted-foreground lg:hidden">
                                        {t(`labels.${column}`)}
                                    </p>
                                    <p
                                        className={
                                            column === "result"
                                                ? "text-foreground"
                                                : "text-muted-foreground"
                                        }
                                    >
                                        {t(`items.${item}.${column}`)}
                                    </p>
                                </div>
                            ))}
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
};
