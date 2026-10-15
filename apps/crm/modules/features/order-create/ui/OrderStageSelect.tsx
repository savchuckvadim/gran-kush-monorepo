"use client";

import { useTranslations } from "next-intl";

import { Field } from "@workspace/ui";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";

import {
    type OrderFunnel,
    type OrderFunnelStage,
    pickFunnel,
    splitFunnelStages,
    stageColor,
} from "@/modules/entities/order";

/** Radix Select has no empty value: this one means "let the API pick the default stage". */
const DEFAULT_STAGE = "__default";

const StageOption = ({ stage }: { stage: OrderFunnelStage }) => (
    <SelectItem value={stage.id}>
        <span
            className="inline-block size-2 shrink-0 rounded-full"
            style={{ backgroundColor: stageColor(stage) }}
        />
        {stage.name}
    </SelectItem>
);

interface OrderStageSelectProps {
    funnels: readonly OrderFunnel[];
    value: string | undefined;
    onChange: (stageId: string | undefined) => void;
    disabled?: boolean;
}

/**
 * Stage of the new order (managers and up, like moving a stage). Working and success stages of
 * every funnel: an order sold on the spot is created completed; cancelled — never.
 */
export function OrderStageSelect({ funnels, value, onChange, disabled }: OrderStageSelectProps) {
    const t = useTranslations("crm.orders.create");
    const defaultFunnel = pickFunnel(funnels);
    const defaultStage = defaultFunnel && splitFunnelStages(defaultFunnel.stages).working[0];

    return (
        <Field label={t("stage")} helperText={t("stageHelp")}>
            <Select
                value={value ?? DEFAULT_STAGE}
                disabled={disabled}
                onValueChange={(stageId) =>
                    onChange(stageId === DEFAULT_STAGE ? undefined : stageId)
                }
            >
                <SelectTrigger className="w-full">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={DEFAULT_STAGE}>
                        {defaultStage
                            ? t("stageDefaultNamed", { stage: defaultStage.name })
                            : t("stageDefault")}
                    </SelectItem>
                    {funnels.map((funnel) => {
                        const { working, success } = splitFunnelStages(funnel.stages);
                        return (
                            <SelectGroup key={funnel.id}>
                                {funnels.length > 1 && <SelectLabel>{funnel.name}</SelectLabel>}
                                {[...working, ...success].map((stage) => (
                                    <StageOption key={stage.id} stage={stage} />
                                ))}
                            </SelectGroup>
                        );
                    })}
                </SelectContent>
            </Select>
        </Field>
    );
}
