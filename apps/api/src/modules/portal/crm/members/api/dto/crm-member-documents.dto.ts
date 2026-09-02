import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString, MaxLength } from "class-validator";

export class CrmMemberFilesRequestDto {
    @ApiPropertyOptional({
        type: String,
        description: "Document type. Required when any identity document side is provided.",
        example: "passport",
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    documentType?: string;
}
