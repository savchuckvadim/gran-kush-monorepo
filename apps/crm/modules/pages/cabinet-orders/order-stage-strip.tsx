"use client";

import { useTranslations } from "next-intl";

import type { SchemaCabinetOrderStageDto } from "@workspace/api-client/core";
import { StageStep, StageSteps } from "@workspace/ui";

import { isClosedSemantic, stageColor } from "@/modules/shared/lib/stage-color";

interface OrderStageStripProps {
    /** Стадии воронки заказа по порядку */
    funnel: SchemaCabinetOrderStageDto[];
    stage: SchemaCabinetOrderStageDto | null;
}

/**
 * Путь заказа по стадиям клуба — та же лента, что в CRM, но только для чтения: текущая стадия
 * залита её цветом, пройденные — тоном, будущие серые. Последний шаг — итог: закрытый заказ
 * показывает, чем закончился, открытый — к чему идёт (первая успешная стадия воронки).
 */
export function OrderStageStrip({ funnel, stage }: OrderStageStripProps) {
    const t = useTranslations("cabinet.orders");
    const working = funnel.filter((step) => !isClosedSemantic(step.semantic));
    const closed = stage !== null && isClosedSemantic(stage.semantic);
    const finish = closed ? stage : funnel.find((step) => step.semantic === "SUCCESS");
    if (working.length === 0 && !finish) return null;

    const reached = closed ? working.length : working.findIndex((step) => step.id === stage?.id);
    const color = stageColor(stage ?? working[0] ?? { semantic: "NEW" });

    return (
        <StageSteps aria-label={t("stagesLabel")}>
            {working.map((step, index) => {
                const isCurrent = step.id === stage?.id;
                return (
                    <StageStep
                        key={step.id}
                        first={index === 0}
                        color={color}
                        filled={index <= reached}
                        current={isCurrent}
                        aria-current={isCurrent ? "step" : undefined}
                        title={step.name}
                        disabled
                    >
                        {step.name}
                    </StageStep>
                );
            })}
            {finish && (
                <StageStep
                    first={working.length === 0}
                    color={closed ? stageColor(finish) : color}
                    filled={closed}
                    current={closed}
                    aria-current={closed ? "step" : undefined}
                    title={finish.name}
                    disabled
                >
                    {finish.name}
                </StageStep>
            )}
        </StageSteps>
    );
}
