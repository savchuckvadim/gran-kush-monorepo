import { ApiPropertyOptional } from "@nestjs/swagger";

import { IsOptional, IsString } from "class-validator";

export class CrmMemberFilesRequestDto {
    @ApiPropertyOptional({
        description: "Document type. Required when any identity document side is provided.",
        example: "passport",
    })
    @IsOptional()
    @IsString()
    documentType?: string;
}
