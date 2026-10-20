import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { CounterpartyKind } from "@prisma/client";
import { IsEnum, IsOptional, IsString, Length, Matches, MaxLength } from "class-validator";

import { IsQueryBoolean } from "@common/decorators/dto/query-boolean.decorator";

const KIND = {
    enum: CounterpartyKind,
    enumName: "CounterpartyKind",
    description: "member заводит система: участник клуба становится контрагентом сам",
} as const;
const COUNTRY = /^[A-Za-z]{2}$/;

export class CounterpartyDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty(KIND)
    kind!: CounterpartyKind;

    @ApiProperty({ type: String, format: "uuid", nullable: true })
    memberId!: string | null;

    @ApiProperty({ type: String, nullable: true, description: "null — участник удалён" })
    name!: string | null;

    @ApiProperty({ type: String, nullable: true, example: "B12345674" })
    nif!: string | null;

    @ApiProperty({ type: String, nullable: true, example: "ES" })
    country!: string | null;

    @ApiProperty({ type: String, nullable: true })
    notes!: string | null;

    @ApiProperty({ type: Number, description: "Проведённых проводок" })
    entryCount!: number;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    archivedAt!: string | null;
}

export class CounterpartyListQueryDto {
    @ApiPropertyOptional({ type: Boolean, description: "Вместе с архивными" })
    @IsOptional()
    @IsQueryBoolean()
    includeArchived?: boolean;
}

export class CounterpartyInputDto {
    @ApiProperty(KIND)
    @IsEnum(CounterpartyKind)
    kind!: CounterpartyKind;

    @ApiProperty({ type: String, example: "Inmobiliaria Sol SL" })
    @IsString()
    @Length(1, 160)
    name!: string;

    @ApiPropertyOptional({ type: String, nullable: true, example: "B12345674" })
    @IsOptional()
    @IsString()
    @MaxLength(24)
    nif?: string | null;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: "ES",
        description: "ISO 3166-1 alpha-2",
    })
    @IsOptional()
    @Matches(COUNTRY)
    country?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string | null;
}
