import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString, Matches, MaxLength, ValidateIf } from "class-validator";

const DATA_URL_PREFIX = /^data:[\w.+-]+\/[\w.+-]+;base64,/u;

export class UploadMemberFilesDto {
    @ApiPropertyOptional({
        type: String,
        description: "Document type. Required when any identity document side is provided.",
        example: "passport",
    })
    @ValidateIf((dto: UploadMemberFilesDto) => Boolean(dto.documentFirst || dto.documentSecond))
    @IsString()
    @MaxLength(50)
    documentType?: string;

    @ApiPropertyOptional({
        type: String,
        description: "Identity document first side as data URL (base64).",
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    })
    @IsOptional()
    @IsString()
    @Matches(DATA_URL_PREFIX, { message: "documentFirst must be a base64 data URL" })
    documentFirst?: string;

    @ApiPropertyOptional({
        type: String,
        description: "Identity document second side as data URL (base64).",
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    })
    @IsOptional()
    @IsString()
    @Matches(DATA_URL_PREFIX, { message: "documentSecond must be a base64 data URL" })
    documentSecond?: string;

    @ApiPropertyOptional({
        type: String,
        description: "Signature image as data URL (base64).",
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    })
    @IsOptional()
    @IsString()
    @Matches(DATA_URL_PREFIX, { message: "signature must be a base64 data URL" })
    signature?: string;
}
