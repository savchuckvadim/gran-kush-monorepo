import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { MemberConsentStatus, MemberJoinSource } from "@prisma/client";
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

/** Членство текущего аккаунта в клубе — в том числе то, что ещё ждёт подтверждения. */
export class MyMembershipDto {
    @ApiProperty({ type: String })
    memberId: string;

    @ApiProperty({ type: String })
    portalId: string;

    @ApiProperty({ type: String })
    slug: string;

    @ApiProperty({ type: String })
    displayName: string;

    @ApiProperty({ enum: MemberConsentStatus })
    consentStatus: MemberConsentStatus;

    @ApiProperty({ enum: MemberJoinSource })
    joinSource: MemberJoinSource;

    @ApiProperty({ type: Boolean, description: "Членство не закрыто выходом или клубом" })
    isActive: boolean;

    @ApiPropertyOptional({
        type: Boolean,
        description: "Запрос на подтверждение старше срока: пусть клуб отправит его заново",
    })
    consentExpired?: boolean;

    @ApiProperty({ type: String, format: "date-time" })
    createdAt: string;
}

export class MyMembershipsResponseDto {
    @ApiProperty({ type: [MyMembershipDto] })
    memberships: MyMembershipDto[];
}

/** Подтверждение под своей сессией: пароль не нужен, сессия уже доказала владение. */
export class ConfirmMyMembershipDto {
    @ApiPropertyOptional({
        type: [String],
        description: "Документы аккаунта, которые показать этому клубу",
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    shareDocumentIds?: string[];

    @ApiPropertyOptional({ type: Boolean, description: "Показать клубу подпись" })
    @IsOptional()
    @IsBoolean()
    shareSignature?: boolean;
}
