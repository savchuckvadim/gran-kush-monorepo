import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString, ValidateIf } from "class-validator";

export class UploadMemberFilesDto {
    @ApiPropertyOptional({ type: String,
        description: "Document type. Required when any identity document side is provided.",
        example: "passport",
    })
    @ValidateIf((dto: UploadMemberFilesDto) => Boolean(dto.documentFirst || dto.documentSecond))
    @IsString()
    documentType?: string;

    @ApiPropertyOptional({ type: String,
        description: "Identity document first side as data URL (base64).",
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    })
    @IsOptional()
    @IsString()
    documentFirst?: string;

    @ApiPropertyOptional({ type: String,
        description: "Identity document second side as data URL (base64).",
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    })
    @IsOptional()
    @IsString()
    documentSecond?: string;

    @ApiPropertyOptional({ type: String,
        description: "Signature image as data URL (base64).",
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    })
    @IsOptional()
    @IsString()
    signature?: string;
}
