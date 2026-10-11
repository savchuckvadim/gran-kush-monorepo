import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@mail/consts/mail.constants";
import { IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

import { BillingSubscriptionDto } from "./billing-subscription.dto";

const PLAN_CODE = /^[a-z0-9-]+$/;

export class CrmBillingQueryDto {
    @ApiPropertyOptional({
        type: String,
        example: "prueba-month",
        description: "Скрытый тариф по прямой ссылке — добавляется в список выбора",
    })
    @IsOptional()
    @IsString()
    @MaxLength(80)
    @Matches(PLAN_CODE)
    plan?: string;
}

export class CrmBillingPlanOptionDto {
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

    @ApiProperty({ type: Boolean, description: "Можно оплатить онлайн прямо сейчас" })
    purchasable: boolean;
}

export class CrmBillingOverviewDto {
    @ApiProperty({ type: BillingSubscriptionDto })
    subscription: BillingSubscriptionDto;

    @ApiProperty({ type: Boolean, description: "Онлайн-оплата подключена (заданы ключи Stripe)" })
    paymentsEnabled: boolean;

    @ApiProperty({ type: Boolean, description: "Есть кабинет Stripe: карта, отмена, счета" })
    canManage: boolean;

    @ApiProperty({ type: [CrmBillingPlanOptionDto] })
    plans: CrmBillingPlanOptionDto[];
}

export class CrmBillingCheckoutDto {
    @ApiProperty({ type: String, example: "club-month" })
    @IsString()
    @MaxLength(80)
    @Matches(PLAN_CODE)
    planCode: string;

    @ApiPropertyOptional({ enum: SUPPORTED_LANGUAGES, example: "es" })
    @IsOptional()
    @IsIn(SUPPORTED_LANGUAGES)
    locale?: SupportedLanguage;
}

export class CrmBillingManageDto {
    @ApiPropertyOptional({ enum: SUPPORTED_LANGUAGES, example: "es" })
    @IsOptional()
    @IsIn(SUPPORTED_LANGUAGES)
    locale?: SupportedLanguage;
}

export class BillingRedirectDto {
    @ApiProperty({ type: String, description: "Страница Stripe, куда перевести пользователя" })
    url: string;
}
