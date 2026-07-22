import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { UserDocumentSide } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class AccountDocumentDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ example: "passport", type: String })
    type: string;

    @ApiProperty({ enum: UserDocumentSide, example: UserDocumentSide.single })
    side: UserDocumentSide;

    @ApiProperty({ type: String, nullable: true })
    number: string | null;

    @ApiProperty({ example: "2026-01-01T00:00:00.000Z", type: String })
    createdAt: string;

    @ApiProperty({ example: "2026-01-01T00:00:00.000Z", type: String })
    updatedAt: string;
}

export class UploadAccountDocumentDto {
    @ApiProperty({ example: "passport", type: String })
    @IsString()
    @MaxLength(50)
    type: string;

    @ApiPropertyOptional({ enum: UserDocumentSide, default: UserDocumentSide.single })
    @IsOptional()
    @IsEnum(UserDocumentSide)
    side?: UserDocumentSide;

    @ApiPropertyOptional({ example: "AB1234567", type: String })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    number?: string;

    @ApiProperty({
        description: "Файл как data URL (base64)",
        example: "data:image/png;base64,....",
        type: String,
    })
    @IsString()
    @Matches(/^data:[\w.+-]+\/[\w.+-]+;base64,/u, {
        message: "file must be a base64 data URL",
    })
    file: string;
}

export class AccountSignatureDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ example: "2026-01-01T00:00:00.000Z", type: String })
    signedAt: string;

    @ApiProperty({ example: "2026-01-01T00:00:00.000Z", type: String })
    updatedAt: string;
}

export class UploadAccountSignatureDto {
    @ApiProperty({
        description: "Подпись как data URL (base64)",
        example: "data:image/png;base64,....",
        type: String,
    })
    @IsString()
    @Matches(/^data:[\w.+-]+\/[\w.+-]+;base64,/u, {
        message: "file must be a base64 data URL",
    })
    file: string;
}

export class AccountDocumentsResponseDto {
    @ApiProperty({ type: [AccountDocumentDto] })
    documents: AccountDocumentDto[];

    @ApiProperty({ type: Boolean })
    hasSignature: boolean;
}

export class DeleteAccountDocumentResponseDto {
    @ApiProperty({ type: Boolean })
    deleted: boolean;
}
