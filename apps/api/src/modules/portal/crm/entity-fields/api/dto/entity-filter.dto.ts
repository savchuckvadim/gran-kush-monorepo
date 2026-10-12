import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { plainToInstance, Transform, type TransformFnParams } from "class-transformer";
import {
    ArrayMaxSize,
    IsArray,
    IsDefined,
    IsIn,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    ValidateNested,
} from "class-validator";

import {
    FIELD_FILTER_OPS,
    type FieldFilterOp,
    type FieldFilterValue,
} from "@modules/portal/crm/entity-fields/domain/entity-filter";

export class FieldConditionDto {
    @ApiProperty({ example: "first_name", type: String })
    @IsString()
    @Matches(/^[a-z0-9_]{1,120}$/)
    field: string;

    @ApiProperty({ enum: FIELD_FILTER_OPS, example: "contains" })
    @IsIn(FIELD_FILTER_OPS)
    op: FieldFilterOp;

    @ApiProperty({
        description:
            "contains — строка; in — массив строк; gte/lte — число или дата ISO; eq — строка, число или boolean",
        oneOf: [
            { type: "string" },
            { type: "number" },
            { type: "boolean" },
            { type: "array", items: { type: "string" } },
        ],
    })
    @IsDefined()
    value: FieldFilterValue;
}

/** Simple-парсер query в Express 5 не разбирает `filter[0][field]`, поэтому условия идут строкой JSON. */
const parseConditions = ({ value }: TransformFnParams): unknown => {
    if (typeof value !== "string") {
        return value;
    }
    if (value.trim() === "") {
        return undefined;
    }
    try {
        const parsed: unknown = JSON.parse(value);
        if (!Array.isArray(parsed)) {
            return parsed;
        }
        return parsed.map((item: unknown) =>
            typeof item === "object" && item !== null
                ? plainToInstance(FieldConditionDto, item)
                : item
        );
    } catch {
        return value;
    }
};

export class EntityFilterDto {
    @ApiPropertyOptional({
        type: String,
        maxLength: 100,
        description: "Поиск по тексту: каждое слово ищется в текстовых полях (без учёта регистра)",
        example: "ana garcía",
    })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    q?: string;

    @ApiPropertyOptional({
        type: String,
        description:
            'Условия по полям — JSON-массив: [{"field":"city","op":"in","value":["madrid"]}]. Условия складываются через И',
        example: '[{"field":"first_name","op":"contains","value":"ana"}]',
    })
    @IsOptional()
    @Transform(parseConditions)
    @IsArray({ message: "filter must be a JSON array of conditions" })
    @ArrayMaxSize(20)
    @ValidateNested({ each: true })
    filter?: FieldConditionDto[];
}
