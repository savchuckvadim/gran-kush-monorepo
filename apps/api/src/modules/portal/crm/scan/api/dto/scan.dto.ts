import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsNotEmpty, IsString, MaxLength } from "class-validator";

import { ProductListDto } from "@modules/portal/crm/catalog/api/dto/product.dto";
import { QrPreviewResultDto } from "@modules/portal/crm/presence/api/dto/presence.dto";

import { SCAN_CODE_MAX_LENGTH } from "../../domain/scanned-code";

export const SCAN_KINDS = ["member", "product", "unknown"] as const;
export const SCAN_UNKNOWN_REASONS = ["product_not_found", "unrecognized"] as const;

export class ResolveScanDto {
    @ApiProperty({
        example: "P-K7M2Q9XA",
        type: String,
        description: "Прочитанный код: `P-<код>` этикетки, код входа участника или штрихкод",
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(SCAN_CODE_MAX_LENGTH)
    code: string;
}

export class ScanResolutionDto {
    @ApiProperty({ enum: SCAN_KINDS, enumName: "ScanKind" })
    kind: (typeof SCAN_KINDS)[number];

    @ApiPropertyOptional({
        type: () => QrPreviewResultDto,
        description: "Код входа участника: предпросмотр стойки (без записи присутствия)",
    })
    member?: QrPreviewResultDto;

    @ApiPropertyOptional({
        type: () => ProductListDto,
        description: "Товар клуба по коду этикетки или штрихкоду",
    })
    product?: ProductListDto;

    @ApiPropertyOptional({
        enum: SCAN_UNKNOWN_REASONS,
        enumName: "ScanUnknownReason",
        description: "product_not_found — код товара не из этого клуба; unrecognized — не код",
    })
    reason?: (typeof SCAN_UNKNOWN_REASONS)[number];
}
