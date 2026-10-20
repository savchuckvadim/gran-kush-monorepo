import { ApiProperty } from "@nestjs/swagger";

import { FinanceAccount } from "@prisma/client";

import { ACCOUNT } from "./ledger-entry-input.dto";

const EUROS = { type: Number, description: "Евро" } as const;

export class DirectionTotalsDto {
    @ApiProperty(EUROS)
    net!: number;

    @ApiProperty(EUROS)
    tax!: number;

    @ApiProperty(EUROS)
    total!: number;

    @ApiProperty(EUROS)
    withholding!: number;

    @ApiProperty(EUROS)
    payable!: number;

    @ApiProperty({ type: Number })
    count!: number;
}

export class CategoryTotalsDto {
    @ApiProperty({ type: String, format: "uuid" })
    categoryId!: string;

    @ApiProperty({ enum: ["income", "expense"] })
    direction!: "income" | "expense";

    @ApiProperty(EUROS)
    net!: number;

    @ApiProperty(EUROS)
    total!: number;

    @ApiProperty({ type: Number })
    count!: number;
}

export class AccountBalanceDto {
    @ApiProperty(ACCOUNT)
    account!: FinanceAccount;

    @ApiProperty({ ...EUROS, description: "Остаток на конец периода по всем проводкам" })
    balance!: number;
}

export class FinanceOverviewDto {
    @ApiProperty({ type: String })
    from!: string;

    @ApiProperty({ type: String })
    to!: string;

    @ApiProperty({ type: () => DirectionTotalsDto })
    income!: DirectionTotalsDto;

    @ApiProperty({ type: () => DirectionTotalsDto })
    expense!: DirectionTotalsDto;

    @ApiProperty({ ...EUROS, description: "Доходы минус расходы по базе" })
    result!: number;

    @ApiProperty({ type: () => [CategoryTotalsDto] })
    byCategory!: CategoryTotalsDto[];

    @ApiProperty({ type: () => [AccountBalanceDto] })
    accounts!: AccountBalanceDto[];
}
