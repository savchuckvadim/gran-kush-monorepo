import { ApiProperty } from "@nestjs/swagger";

import { PortalStatus, PortalTypeEnum, SubscriptionStatus } from "@prisma/client";

export class PortalSubscriptionInfoDto {
    @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.active })
    status!: SubscriptionStatus;

    @ApiProperty({ type: String, nullable: true, example: "Start" })
    planName!: string | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    graceEndsAt!: string | null;
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

    @ApiProperty({ enum: PortalStatus })
    status!: PortalStatus;

    @ApiProperty({ type: PortalSubscriptionInfoDto, nullable: true })
    subscription!: PortalSubscriptionInfoDto | null;
}
