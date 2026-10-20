import { ApiProperty } from "@nestjs/swagger";

import { IMPORT_COLUMNS, type ImportColumn } from "../../domain/import/import-columns";
import { IMPORT_ISSUES, type ImportIssueCode } from "../../domain/import/import-row";

export class ImportIssueDto {
    @ApiProperty({ enum: IMPORT_COLUMNS, enumName: "LedgerImportColumn", nullable: true })
    column!: ImportColumn | null;

    @ApiProperty({ enum: Object.values(IMPORT_ISSUES), enumName: "LedgerImportIssue" })
    code!: ImportIssueCode;
}

export class ImportPreviewDto {
    @ApiProperty({ enum: ["income", "expense"] })
    direction!: "income" | "expense";

    @ApiProperty({ type: String, example: "2026-10-05" })
    occurredOn!: string;

    @ApiProperty({ type: String, format: "uuid" })
    categoryId!: string;

    @ApiProperty({ type: String })
    description!: string;

    @ApiProperty({ type: String, nullable: true })
    counterparty!: string | null;

    @ApiProperty({ type: Number, description: "Евро: база + IVA − IRPF" })
    total!: number;
}

export class ImportRowDto {
    @ApiProperty({ type: Number, description: "Номер строки в файле; заголовки — строка 1" })
    row!: number;

    @ApiProperty({ enum: ["create", "duplicate", "error"], enumName: "LedgerImportRowStatus" })
    status!: "create" | "duplicate" | "error";

    @ApiProperty({ type: () => [ImportIssueDto] })
    issues!: ImportIssueDto[];

    @ApiProperty({ type: () => ImportPreviewDto, nullable: true })
    preview!: ImportPreviewDto | null;
}

export class ImportReportDto {
    @ApiProperty({ type: Boolean, description: "false — только проверка" })
    committed!: boolean;

    @ApiProperty({ type: Number, description: "Сколько проводок записано" })
    created!: number;

    @ApiProperty({ type: () => [ImportRowDto] })
    rows!: ImportRowDto[];
}
