import { ApiProperty, IntersectionType, PickType } from "@nestjs/swagger";

import { FinanceAccount, TaxTreatment } from "@prisma/client";
import { Type } from "class-transformer";
import { IsIn, IsInt, Matches, Max, Min } from "class-validator";

import { PaginationDto } from "@common/paginate/dto/pagination.dto";

import { type Quarter, QUARTERS } from "../../domain/reports/report-period";
import {
    FORM_NOT_APPLICABLE,
    FORM_NOTES,
    type FormNotApplicable,
    type FormNote,
    SKIPPED_CELL,
    TAX_FORMS,
    type TaxFormCode,
} from "../../domain/reports/tax-form";

import { ACCOUNT } from "./ledger-entry-input.dto";

const EUROS = { type: Number, description: "Евро" } as const;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

export class VatRowDto {
    @ApiProperty({ type: Number })
    percent!: number;

    @ApiProperty({
        enum: TaxTreatment,
        enumName: "TaxTreatment",
        nullable: true,
        description: "null — строки без ставки: заказ до включения финансов",
    })
    treatment!: TaxTreatment | null;

    @ApiProperty(EUROS)
    base!: number;

    @ApiProperty(EUROS)
    tax!: number;

    @ApiProperty({ type: Number })
    count!: number;
}

export class VatBreakdownDto {
    @ApiProperty({ type: () => [VatRowDto], description: "Начисленный — с доходов" })
    output!: VatRowDto[];

    @ApiProperty({ type: () => [VatRowDto], description: "Уплаченный — в расходах" })
    input!: VatRowDto[];

    @ApiProperty(EUROS)
    outputTax!: number;

    @ApiProperty(EUROS)
    inputTax!: number;

    @ApiProperty({ ...EUROS, description: "Начисленный минус уплаченный, без правил вычета" })
    balance!: number;
}

export class WithholdingSideDto {
    @ApiProperty(EUROS)
    base!: number;

    @ApiProperty(EUROS)
    amount!: number;

    @ApiProperty({ type: Number })
    count!: number;

    @ApiProperty({ type: Number })
    counterparties!: number;
}

export class WithholdingTotalsDto {
    @ApiProperty({ type: () => WithholdingSideDto, description: "Удержали с наших доходов" })
    received!: WithholdingSideDto;

    @ApiProperty({ type: () => WithholdingSideDto, description: "Мы удержали с профессионалов" })
    applied!: WithholdingSideDto;
}

export class AccountFlowDto {
    @ApiProperty(ACCOUNT)
    account!: FinanceAccount;

    @ApiProperty(EUROS)
    opening!: number;

    @ApiProperty(EUROS)
    inflow!: number;

    @ApiProperty(EUROS)
    outflow!: number;

    @ApiProperty(EUROS)
    closing!: number;
}

export class PeriodReportDto {
    @ApiProperty({ type: String })
    from!: string;

    @ApiProperty({ type: String })
    to!: string;

    @ApiProperty({ type: () => VatBreakdownDto })
    vat!: VatBreakdownDto;

    @ApiProperty({ type: () => WithholdingTotalsDto })
    withholding!: WithholdingTotalsDto;

    @ApiProperty({ type: () => [AccountFlowDto] })
    accounts!: AccountFlowDto[];
}

export class FormCellDto {
    @ApiProperty({ type: String, description: "Номер ячейки бланка (casilla)", example: "07" })
    code!: string;

    @ApiProperty({ enum: ["amount", "percent"] })
    kind!: "amount" | "percent";

    @ApiProperty({ type: Number, description: "Евро или процент" })
    value!: number;

    @ApiProperty({ type: Boolean, description: "Посчитана из других ячеек" })
    computed!: boolean;

    @ApiProperty({ type: Number, description: "Проводок в ячейке" })
    entryCount!: number;
}

export class TaxFormDto {
    @ApiProperty({ enum: TAX_FORMS, enumName: "TaxFormCode" })
    form!: TaxFormCode;

    @ApiProperty({ type: Number })
    year!: number;

    @ApiProperty({ type: Number })
    quarter!: number;

    @ApiProperty({ type: String })
    from!: string;

    @ApiProperty({ type: String })
    to!: string;

    @ApiProperty({ type: Boolean })
    applicable!: boolean;

    @ApiProperty({
        enum: Object.values(FORM_NOT_APPLICABLE),
        enumName: "TaxFormNotApplicable",
        nullable: true,
    })
    reason!: FormNotApplicable | null;

    @ApiProperty({ type: () => [FormCellDto] })
    cells!: FormCellDto[];

    @ApiProperty({
        enum: Object.values(FORM_NOTES),
        enumName: "TaxFormNote",
        isArray: true,
    })
    notes!: FormNote[];

    @ApiProperty({ type: Number, description: "Проводок, не попавших в форму" })
    skippedCount!: number;
}

export class QuarterQueryDto {
    @ApiProperty({ type: Number, example: 2026 })
    @Type(() => Number)
    @IsInt()
    @Min(MIN_YEAR)
    @Max(MAX_YEAR)
    year!: number;

    @ApiProperty({ type: Number, enum: QUARTERS, example: 4 })
    @Type(() => Number)
    @IsIn(QUARTERS)
    quarter!: Quarter;
}

export class FormCellParamsDto {
    @ApiProperty({ enum: TAX_FORMS, enumName: "TaxFormCode" })
    @IsIn(TAX_FORMS)
    form!: TaxFormCode;

    @ApiProperty({ type: String, description: `Номер ячейки или «${SKIPPED_CELL}»` })
    @Matches(new RegExp(`^(\\d{2,3}|${SKIPPED_CELL})$`))
    cell!: string;
}

export class FormCellEntriesQueryDto extends IntersectionType(
    PickType(PaginationDto, ["page", "limit"] as const),
    QuarterQueryDto
) {}
