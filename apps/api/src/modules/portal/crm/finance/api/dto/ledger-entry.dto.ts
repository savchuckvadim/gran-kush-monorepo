import { ApiProperty } from "@nestjs/swagger";

import {
    FinanceAccount,
    LedgerDirection,
    LedgerDocumentType,
    LedgerEntryStatus,
    TaxTreatment,
} from "@prisma/client";

import { LEDGER_SOURCES, type LedgerSource } from "../../domain/ledger/ledger-entry";

import { ACCOUNT, DIRECTION, DOCUMENT_TYPE } from "./ledger-entry-input.dto";

const EUROS = { type: Number, description: "Евро" } as const;

/** Что можно поменять: всё, разметку (статья, счёт, заметки), только заметки или ничего. */
export const ENTRY_EDIT_MODES = ["full", "classification", "notes", "none"] as const;
export type EntryEditMode = (typeof ENTRY_EDIT_MODES)[number];

export class LedgerLineDto {
    @ApiProperty({ type: Number, example: 21 })
    percent!: number;

    @ApiProperty({
        enum: TaxTreatment,
        enumName: "TaxTreatment",
        nullable: true,
        description: "null — без разбивки налога (заказ до включения финансов)",
    })
    treatment!: TaxTreatment | null;

    @ApiProperty({ ...EUROS, example: 100 })
    net!: number;

    @ApiProperty({ ...EUROS, example: 21 })
    tax!: number;
}

export class LedgerWithholdingDto {
    @ApiProperty({ type: Number, example: 15 })
    percent!: number;

    @ApiProperty({ ...EUROS, example: 15 })
    amount!: number;
}

export class LedgerAttachmentDto {
    @ApiProperty({ type: String, example: "ticket.pdf" })
    name!: string;

    @ApiProperty({ type: String, example: "application/pdf" })
    mime!: string;

    @ApiProperty({ type: Number, description: "Байт" })
    size!: number;
}

export class LedgerTotalsDto {
    @ApiProperty(EUROS)
    net!: number;

    @ApiProperty(EUROS)
    tax!: number;

    @ApiProperty({ ...EUROS, description: "По документу: база + налог" })
    total!: number;

    @ApiProperty(EUROS)
    withholding!: number;

    @ApiProperty({ ...EUROS, description: "Сколько денег прошло по счёту: итог − IRPF" })
    payable!: number;
}

export class LedgerEntryDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty(DIRECTION)
    direction!: LedgerDirection;

    @ApiProperty({ enum: LedgerEntryStatus, enumName: "LedgerEntryStatus" })
    status!: LedgerEntryStatus;

    @ApiProperty({ type: String, example: "2026-10-05" })
    occurredOn!: string;

    @ApiProperty({ type: String, format: "uuid", nullable: true })
    categoryId!: string | null;

    @ApiProperty({ type: String, format: "uuid", nullable: true })
    counterpartyId!: string | null;

    @ApiProperty({ type: String, nullable: true })
    counterpartyName!: string | null;

    @ApiProperty({ type: String, nullable: true })
    counterpartyNif!: string | null;

    @ApiProperty(ACCOUNT)
    account!: FinanceAccount;

    @ApiProperty({ ...ACCOUNT, nullable: true })
    toAccount!: FinanceAccount | null;

    @ApiProperty({ type: String, example: "EUR" })
    currency!: string;

    @ApiProperty(DOCUMENT_TYPE)
    documentType!: LedgerDocumentType;

    @ApiProperty({ type: String, nullable: true })
    documentNumber!: string | null;

    @ApiProperty({ type: String, nullable: true })
    documentDate!: string | null;

    @ApiProperty({ type: String, nullable: true })
    paidOn!: string | null;

    @ApiProperty({ type: String, nullable: true, description: "Пусто у проводки из заказа" })
    description!: string | null;

    @ApiProperty({ type: String, nullable: true })
    notes!: string | null;

    @ApiProperty({ enum: Object.values(LEDGER_SOURCES), enumName: "LedgerSource" })
    sourceType!: LedgerSource;

    @ApiProperty({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Заказ проводки оплаты: открыть заказ из реестра",
    })
    orderId!: string | null;

    @ApiProperty({ type: String, nullable: true, description: "Номер заказа" })
    sourceLabel!: string | null;

    @ApiProperty({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Что отменяет это сторно",
    })
    reversalOfId!: string | null;

    @ApiProperty({
        type: String,
        format: "uuid",
        nullable: true,
        description: "Сторно этой проводки",
    })
    reversedById!: string | null;

    @ApiProperty({ type: () => [LedgerLineDto] })
    lines!: LedgerLineDto[];

    @ApiProperty({ type: () => LedgerWithholdingDto, nullable: true })
    withholding!: LedgerWithholdingDto | null;

    @ApiProperty({ type: () => LedgerTotalsDto })
    totals!: LedgerTotalsDto;

    @ApiProperty({ type: () => LedgerAttachmentDto, nullable: true })
    attachment!: LedgerAttachmentDto | null;

    @ApiProperty({ enum: ENTRY_EDIT_MODES, enumName: "EntryEditMode" })
    editable!: EntryEditMode;

    @ApiProperty({ type: String, nullable: true })
    authorName!: string | null;

    @ApiProperty({ type: String, format: "date-time" })
    createdAt!: string;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    voidedAt!: string | null;
}

export class CancelledEntryDto {
    @ApiProperty({
        enum: ["voided", "reversed"],
        description: "voided — вышла из итогов; reversed — сторно в открытом месяце",
    })
    mode!: "voided" | "reversed";

    @ApiProperty({ type: () => LedgerEntryDto, description: "Отменённая проводка или сторно" })
    entry!: LedgerEntryDto;
}
