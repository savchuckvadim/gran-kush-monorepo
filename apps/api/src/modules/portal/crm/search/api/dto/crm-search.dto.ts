import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";

export class CrmSearchQueryDto {
    @ApiProperty({ type: String, example: "lucía", description: "Минимум 2 символа" })
    @IsString()
    @MinLength(2)
    @MaxLength(80)
    q: string;

    @ApiPropertyOptional({
        type: Number,
        example: 5,
        description: "Сколько результатов в каждой группе",
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(10)
    limit?: number;
}

export class CrmSearchMemberDto {
    @ApiProperty({ type: String, format: "uuid" })
    id: string;

    @ApiProperty({ type: String, example: "Lucía Martín" })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: "0142" })
    membershipNumber: string | null;

    @ApiProperty({ type: String, example: "lucia@example.com" })
    email: string;
}

export class CrmSearchProductDto {
    @ApiProperty({ type: String, format: "uuid" })
    id: string;

    @ApiProperty({ type: String })
    name: string;

    @ApiProperty({ type: String, nullable: true })
    sku: string | null;
}

export class CrmSearchOrderDto {
    @ApiProperty({ type: String, format: "uuid" })
    id: string;

    @ApiProperty({ type: String, example: "ORD-0001" })
    orderNumber: string;

    @ApiProperty({ type: String })
    memberName: string;

    @ApiProperty({ type: String, format: "date-time" })
    orderedAt: string;
}

export class CrmSearchResponseDto {
    @ApiProperty({ type: [CrmSearchMemberDto] })
    members: CrmSearchMemberDto[];

    @ApiProperty({ type: [CrmSearchProductDto] })
    products: CrmSearchProductDto[];

    @ApiProperty({ type: [CrmSearchOrderDto] })
    orders: CrmSearchOrderDto[];
}
