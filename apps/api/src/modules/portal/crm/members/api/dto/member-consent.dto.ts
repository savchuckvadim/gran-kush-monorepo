import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { UserDocumentSide } from "@prisma/client";
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from "class-validator";

export class PublicConsentDocumentDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ example: "passport", type: String })
    type: string;

    @ApiProperty({ enum: UserDocumentSide })
    side: UserDocumentSide;
}

/** Что видит владелец аккаунта на странице согласия: какой клуб, какой email, что можно показать. */
export class PublicMemberConsentInfoDto {
    @ApiProperty({ type: String })
    portalSlug: string;

    @ApiProperty({ type: String })
    portalDisplayName: string;

    @ApiProperty({ type: String })
    email: string;

    @ApiProperty({ type: [PublicConsentDocumentDto] })
    documents: PublicConsentDocumentDto[];

    @ApiProperty({ type: Boolean })
    hasSignature: boolean;
}

export class ConfirmMemberConsentDto {
    @ApiProperty({ type: String, description: "Пароль аккаунта — доказательство, что он ваш" })
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    password: string;

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

export class DeclineMemberConsentDto {
    @ApiProperty({ type: String })
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    password: string;
}

export class MemberConsentResultDto {
    @ApiProperty({ type: String })
    portalSlug: string;

    @ApiPropertyOptional({ type: String, description: "Есть, когда членство подтверждено" })
    memberId?: string;
}
