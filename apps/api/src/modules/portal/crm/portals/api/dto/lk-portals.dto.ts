import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsObject, IsOptional } from "class-validator";

export class MyClubDto {
    @ApiProperty({ type: String })
    portalId: string;

    @ApiProperty({ example: "green-club", type: String })
    slug: string;

    @ApiProperty({ example: "Green Club", type: String })
    displayName: string;

    @ApiProperty({ type: String })
    memberId: string;

    @ApiPropertyOptional({ type: String })
    membershipNumber?: string;

    @ApiProperty({ type: Boolean })
    isActive: boolean;

    @ApiProperty({ example: "2026-01-01T00:00:00.000Z", type: String })
    joinedAt: string;
}

export class MyClubsResponseDto {
    @ApiProperty({ type: [MyClubDto] })
    clubs: MyClubDto[];
}

export class JoinPortalDto {
    @ApiPropertyOptional({
        type: "object",
        additionalProperties: true,
        description: "Динамические поля формы public_registration портала",
    })
    @IsOptional()
    @IsObject()
    fields?: Record<string, unknown>;
}

export class JoinPortalResponseDto {
    @ApiProperty({ type: String })
    memberId: string;

    @ApiProperty({ type: String })
    portalId: string;
}

export class MyPortalDto {
    @ApiProperty({ type: String })
    portalId: string;

    @ApiProperty({ example: "green-club", type: String })
    slug: string;

    @ApiProperty({ example: "Green Club", type: String })
    displayName: string;

    @ApiProperty({ type: String })
    employeeId: string;

    @ApiProperty({ example: "manager", type: String })
    role: string;

    @ApiProperty({ type: Boolean })
    isActive: boolean;
}

export class MyPortalsResponseDto {
    @ApiProperty({ type: [MyPortalDto] })
    portals: MyPortalDto[];
}
