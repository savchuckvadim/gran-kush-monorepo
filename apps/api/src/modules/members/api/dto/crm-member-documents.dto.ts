import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsOptional, IsString, ValidateIf } from "class-validator";


export class CrmMemberFilesRequestDto {
    @ApiPropertyOptional({
        description: "Document type. Required when any identity document side is provided.",
        example: "passport",
    })
    @ValidateIf((dto: CrmMemberFilesRequestDto) => Boolean(dto.documentFirst || dto.documentSecond))
    @IsString()
    documentType?: string;
    
    @ApiPropertyOptional({
        description: "Identity document first side as data URL (base64).",
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    })
    @IsOptional()
    @IsString()
    documentFirst?: string;
    
    @ApiPropertyOptional({
        description: "Identity document second side as data URL (base64).",
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    })
    @IsOptional()
    @IsString()
    documentSecond?: string;
    
    @ApiPropertyOptional({
        description: "Signature image as data URL (base64).",
        example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    })
    @IsOptional()
    @IsString()
    signature?: string;
}
