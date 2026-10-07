import { ApiProperty } from "@nestjs/swagger";

export class BillingPlanCatalogItemDto {
    @ApiProperty({ type: String, example: "club-month" })
    code: string;

    @ApiProperty({ type: String, example: "Club" })
    name: string;

    @ApiProperty({
        type: String,
        example: "49.00",
        description:
            "Цена за один `interval`: десятичная строка с двумя знаками после точки, без перевода в float",
    })
    priceAmount: string;

    @ApiProperty({ type: String, example: "EUR", description: "Код валюты ISO 4217" })
    currency: string;

    @ApiProperty({ type: String, example: "month", description: "Период списания" })
    interval: string;

    @ApiProperty({
        type: "object",
        additionalProperties: { type: "boolean" },
        example: { crm: true, sites: true, messenger: false },
        description: "Флаги возможностей тарифа (`featuresJson`)",
    })
    features: Record<string, boolean>;
}

export class BillingPlanCatalogResponseDto {
    @ApiProperty({
        type: [BillingPlanCatalogItemDto],
        description: "Активные тарифы по возрастанию цены, при равной цене — по коду",
    })
    plans: BillingPlanCatalogItemDto[];
}
