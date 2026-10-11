import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
    IsBoolean,
    IsIn,
    IsInt,
    IsISO8601,
    IsObject,
    IsOptional,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min,
    ValidateIf,
} from "class-validator";

import { BillingSubscriptionDto } from "./billing-subscription.dto";

const PLAN_CODE = /^[a-z0-9-]+$/;
const AMOUNT = /^\d{1,10}(\.\d{1,2})?$/;
const STRIPE_PRICE_ID = /^price_[A-Za-z0-9]+$/;
const INTERVALS = ["month", "year"] as const;

class BillingPlanFieldsDto {
    @ApiPropertyOptional({ type: String, example: "Club" })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: "price_1QxYz...",
        description:
            "Цена в Stripe. Сумма, валюта и период берутся из неё; null — отвязать тариф от Stripe",
    })
    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @Matches(STRIPE_PRICE_ID)
    stripePriceId?: string | null;

    @ApiPropertyOptional({
        type: String,
        example: "49.00",
        description: "Только для тарифа без Stripe (ручная оплата)",
    })
    @IsOptional()
    @Matches(AMOUNT)
    priceAmount?: string;

    @ApiPropertyOptional({ type: String, example: "EUR" })
    @IsOptional()
    @Matches(/^[A-Z]{3}$/)
    currency?: string;

    @ApiPropertyOptional({ enum: INTERVALS, example: "month" })
    @IsOptional()
    @IsIn(INTERVALS)
    interval?: string;

    @ApiPropertyOptional({
        type: "object",
        additionalProperties: { type: "boolean" },
        example: { crm: true, messenger: false },
    })
    @IsOptional()
    @IsObject()
    features?: Record<string, boolean>;

    @ApiPropertyOptional({
        type: Boolean,
        description: "false — архив: не продаётся, подписки живут",
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        type: Boolean,
        description: "false — скрыт с сайта, выбирается только по ссылке ?plan=<code>",
    })
    @IsOptional()
    @IsBoolean()
    isPublic?: boolean;
}

export class CreateBillingPlanDto extends BillingPlanFieldsDto {
    @ApiProperty({ type: String, example: "club-month" })
    @IsString()
    @MaxLength(80)
    @Matches(PLAN_CODE)
    code: string;
}

export class UpdateBillingPlanDto extends BillingPlanFieldsDto {}

export class AdminBillingPlanDto {
    @ApiProperty({ type: String, example: "club-month" })
    code: string;

    @ApiProperty({ type: String, example: "Club" })
    name: string;

    @ApiProperty({ type: String, example: "49.00" })
    priceAmount: string;

    @ApiProperty({ type: String, example: "EUR" })
    currency: string;

    @ApiProperty({ type: String, example: "month" })
    interval: string;

    @ApiProperty({ type: "object", additionalProperties: { type: "boolean" } })
    features: Record<string, boolean>;

    @ApiProperty({ type: Boolean })
    isActive: boolean;

    @ApiProperty({ type: Boolean })
    isPublic: boolean;

    @ApiProperty({ type: String, nullable: true })
    stripePriceId: string | null;
}

export class AdminPortalSubscriptionDto {
    @ApiProperty({ type: String, format: "uuid" })
    portalId: string;

    @ApiProperty({ type: String, description: "Адрес клуба (slug)" })
    portalName: string;

    @ApiProperty({ type: String })
    portalDisplayName: string;

    @ApiProperty({ type: String, format: "date-time" })
    portalCreatedAt: string;

    @ApiProperty({ type: BillingSubscriptionDto, nullable: true })
    subscription: BillingSubscriptionDto | null;
}

export class ManualPaymentDto {
    @ApiProperty({ type: Number, example: 1, description: "Сколько месяцев оплачено" })
    @IsInt()
    @Min(1)
    @Max(36)
    months: number;

    @ApiPropertyOptional({
        type: String,
        example: "49.00",
        description: "Полученная сумма; по умолчанию цена тарифа × месяцы",
    })
    @IsOptional()
    @Matches(AMOUNT)
    amount?: string;

    @ApiPropertyOptional({ type: String, example: "club-month", description: "Сменить тариф" })
    @IsOptional()
    @IsString()
    @Matches(PLAN_CODE)
    planCode?: string;
}

export class TrialEndDto {
    @ApiProperty({ type: String, format: "date-time", example: "2027-10-11T00:00:00.000Z" })
    @IsISO8601()
    trialEndsAt: string;
}
