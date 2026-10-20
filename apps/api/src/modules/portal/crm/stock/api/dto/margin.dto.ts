import { ApiProperty } from "@nestjs/swagger";

const EUROS = { type: Number, description: "Евро" } as const;

export class MarginRowDto {
    @ApiProperty({ type: String, format: "uuid" })
    productId!: string;

    @ApiProperty({ type: String })
    productName!: string;

    @ApiProperty({ type: String, format: "uuid" })
    categoryId!: string;

    @ApiProperty({ type: String })
    categoryName!: string;

    @ApiProperty({ type: Number, description: "Продано единиц" })
    quantity!: number;

    @ApiProperty({ ...EUROS, description: "Выручка без налога" })
    revenue!: number;

    @ApiProperty({
        ...EUROS,
        nullable: true,
        description: "Себестоимость проданного; null — поставок не было",
    })
    cost!: number | null;

    @ApiProperty({ ...EUROS, nullable: true })
    margin!: number | null;

    @ApiProperty({ type: Number, nullable: true, description: "Маржа в процентах от выручки" })
    marginPercent!: number | null;
}

export class MarginReportDto {
    @ApiProperty({ type: String })
    from!: string;

    @ApiProperty({ type: String })
    to!: string;

    @ApiProperty({ ...EUROS, description: "Выручка строк с известной себестоимостью" })
    revenue!: number;

    @ApiProperty(EUROS)
    cost!: number;

    @ApiProperty(EUROS)
    margin!: number;

    @ApiProperty({ ...EUROS, description: "Выручка строк без себестоимости — маржа неизвестна" })
    revenueWithoutCost!: number;

    @ApiProperty({
        type: () => [MarginRowDto],
        description: "Самые прибыльные сверху, убыточные снизу",
    })
    byProduct!: MarginRowDto[];
}
