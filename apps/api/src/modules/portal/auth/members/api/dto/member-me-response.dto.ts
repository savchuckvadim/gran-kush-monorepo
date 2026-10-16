import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { MemberConsentStatus } from "@prisma/client";

export class MemberMembershipDto {
    @ApiProperty({ example: "f5f0c2f1-c877-4f13-8b6a-5b5b7c8f9c1f", type: String })
    portalId: string;

    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174999", type: String })
    memberId: string;

    @ApiPropertyOptional({ example: "MBR-000123", type: String })
    membershipNumber?: string;

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;

    @ApiProperty({
        enum: MemberConsentStatus,
        description:
            "pending — клуб добавил вас, ждёт вашего подтверждения (`/cabinet/memberships`)",
    })
    consentStatus: MemberConsentStatus;
}

/** Глобальный аккаунт ЛК: user + его membership-мосты по порталам. */
export class MemberMeResponseDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "user@example.com", type: String })
    email: string;

    @ApiProperty({ example: true, type: Boolean })
    emailConfirmed: boolean;

    @ApiProperty({ type: () => [MemberMembershipDto] })
    memberships: MemberMembershipDto[];

    @ApiProperty({
        type: Boolean,
        description:
            "Аккаунт ещё и сотрудник клуба (активное трудоустройство): кабинет показывает «Открыть CRM»",
    })
    hasEmployments: boolean;
}
