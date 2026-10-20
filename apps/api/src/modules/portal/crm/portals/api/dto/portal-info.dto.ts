import { ApiProperty } from "@nestjs/swagger";

import { PortalStatus, PortalTypeEnum, SubscriptionStatus } from "@prisma/client";

export class PortalSubscriptionInfoDto {
    @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.active })
    status!: SubscriptionStatus;

    @ApiProperty({ type: String, nullable: true, example: "Start" })
    planName!: string | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    graceEndsAt!: string | null;

    @ApiProperty({
        type: String,
        format: "date-time",
        nullable: true,
        description: "Конец бесплатного периода (пока status = trialing)",
    })
    trialEndsAt!: string | null;

    @ApiProperty({
        type: "object",
        additionalProperties: { type: "boolean" },
        example: { customBrand: true },
        description: "Возможности тарифа. customBrand — в CRM название клуба вместо PafPaf",
    })
    features!: Record<string, boolean>;
}

export class PortalInfoDto {
    @ApiProperty({ type: String, format: "uuid" })
    portalId!: string;

    @ApiProperty({ type: String, description: "Portal slug" })
    name!: string;

    @ApiProperty({ type: String })
    displayName!: string;

    @ApiProperty({ enum: PortalTypeEnum })
    type!: PortalTypeEnum;

    @ApiProperty({
        type: [String],
        description: "Включённые подключаемые модули (TASK-796): меню CRM показывает их разделы",
        example: ["finance"],
    })
    modules!: string[];

    @ApiProperty({ enum: PortalStatus })
    status!: PortalStatus;

    @ApiProperty({
        type: String,
        nullable: true,
        description: "Тема клуба по умолчанию (id темы CRM); null — тема PafPaf",
    })
    defaultSkin!: string | null;

    @ApiProperty({ type: PortalSubscriptionInfoDto, nullable: true })
    subscription!: PortalSubscriptionInfoDto | null;
}
