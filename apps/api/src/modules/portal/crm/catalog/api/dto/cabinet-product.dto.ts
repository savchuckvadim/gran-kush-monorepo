import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/*
 * Товар глазами участника. Складские данные клуба (артикул, остатки, порог дозаказа) сюда не
 * попадают: участнику нужно только «есть / нет».
 */

export class CabinetProductCategoryDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "Flores", type: String })
    name: string;
}

export class CabinetProductUnitDto {
    @ApiProperty({ example: "g", type: String })
    code: string;

    @ApiProperty({ example: "Gramo", type: String })
    name: string;
}

export class CabinetProductDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })
    id: string;

    @ApiProperty({ example: "Producto A", type: String })
    name: string;

    @ApiPropertyOptional({ example: "Descripción del producto", type: String, nullable: true })
    description: string | null;

    @ApiProperty({ example: 15.5, type: Number, description: "Цена за единицу" })
    price: number;

    @ApiPropertyOptional({ example: "/storage/products/img.jpg", type: String, nullable: true })
    imageUrl: string | null;

    @ApiPropertyOptional({ type: () => CabinetProductCategoryDto, nullable: true })
    category: CabinetProductCategoryDto | null;

    @ApiPropertyOptional({ type: () => CabinetProductUnitDto, nullable: true })
    unit: CabinetProductUnitDto | null;

    @ApiProperty({ type: Boolean, description: "Есть на складе (точный остаток не раскрывается)" })
    inStock: boolean;

    @ApiPropertyOptional({ example: 22.5, type: Number, nullable: true })
    thc: number | null;

    @ApiPropertyOptional({ example: 0.5, type: Number, nullable: true })
    cbd: number | null;

    @ApiPropertyOptional({ example: "Variante A", type: String, nullable: true })
    strain: string | null;

    @ApiPropertyOptional({
        example: 1,
        type: Number,
        nullable: true,
        description: "Сколько граммов лимита занимает единица; пусто — товар в лимит не входит",
    })
    limitGramsPerUnit: number | null;
}
