import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { FormPurpose, PortalFieldType, Prisma, StageSemantic } from "@prisma/client";
import { Type } from "class-transformer";

/** Элемент статуса жизненного цикла member (filters / selects). */
export class MemberLifecycleStatusItemDto {
    @ApiProperty({ example: "123", type: String })
    id: string;

    @ApiProperty({ example: "active", type: String })
    key: string;

    @ApiProperty({ example: "Active", type: String })
    label: string;

    @ApiPropertyOptional({ nullable: true, example: "#000000", type: String, required: false })
    color: string | null;

    @ApiProperty({ example: 1, type: Number })
    sortOrder: number;
}

/** Опция enum/select в схеме формы / фильтров. */
export class FormFieldOptionSchemaDto {
    @ApiProperty({ example: "active", type: String })
    valueKey: string;

    @ApiProperty({ example: "Active", type: String })
    label: string;

    @ApiPropertyOptional({ nullable: true, example: "#000000", type: String, required: false })
    color: string | null;

    @ApiProperty({ example: 1, type: Number })
    sortOrder: number;
}

/** Поле формы или фильтра member (settings). */
export class MemberFormFieldSchemaItemDto {
    @ApiProperty({ example: "name", type: String })
    fieldKey: string;

    @ApiProperty({ example: "text", type: String })
    type: string;

    @ApiPropertyOptional({ nullable: true, example: "Name", type: String, required: false })
    label: string | null;

    @ApiPropertyOptional({ nullable: true, example: "Name", type: String, required: false })
    helpText: string | null;

    @ApiProperty({ example: true, type: Boolean })
    required: boolean;

    @ApiProperty({ example: true, type: Boolean })
    visible: boolean;

    @ApiProperty({ example: true, type: Boolean })
    readOnly: boolean;

    @ApiProperty({ example: true, type: Boolean })
    isMultiple: boolean;

    @ApiPropertyOptional({ nullable: true })
    sectionCode: string | null;

    @ApiProperty({ example: 1, type: Number })
    sortOrder: number;

    @ApiPropertyOptional({ type: Object, nullable: true, additionalProperties: true })
    validationJson: Prisma.JsonValue | null;

    @ApiPropertyOptional({ type: Object, nullable: true, additionalProperties: true })
    defaultValueJson: Prisma.JsonValue | null;

    @ApiProperty({ type: [FormFieldOptionSchemaDto] })
    @Type(() => FormFieldOptionSchemaDto)
    options: FormFieldOptionSchemaDto[];
}

/** Ответ `GET .../member/form-schema/:purpose`. */
export class MemberFormSchemaResponseDto {
    @ApiProperty({ enum: FormPurpose })
    purpose: FormPurpose;

    @ApiProperty({ type: [MemberFormFieldSchemaItemDto] })
    @Type(() => MemberFormFieldSchemaItemDto)
    fields: MemberFormFieldSchemaItemDto[];
}

/** Опция поля в списке определений (Prisma `FieldOption`). */
export class MemberFieldOptionResponseDto {
    @ApiProperty({ example: "123", type: String })
    id: string;

    @ApiProperty({ example: "123", type: String })
    fieldDefinitionId: string;

    @ApiProperty({ example: "active", type: String })
    valueKey: string;

    @ApiProperty({ example: "Active", type: String })
    label: string;

    @ApiProperty({ example: 1, type: Number })
    sortOrder: number;

    @ApiPropertyOptional({ nullable: true, example: "#000000", type: String, required: false })
    color: string | null;

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;

    @ApiProperty({ example: "2021-01-01T00:00:00.000Z", type: Date })
    createdAt: Date;

    @ApiProperty({ example: "2021-01-01T00:00:00.000Z", type: Date })
    updatedAt: Date;
}

/** Определение поля member со вложенными опциями (список / create / patch). */
export class MemberFieldDefinitionResponseDto {
    @ApiProperty({ example: "123", type: String })
    id: string;

    @ApiProperty({ example: "123", type: String })
    entityDefinitionId: string;

    @ApiProperty({ example: "name", type: String })
    fieldKey: string;

    @ApiProperty({ enum: PortalFieldType })
    type: PortalFieldType;

    @ApiPropertyOptional({ nullable: true, example: "Name", type: String, required: false })
    label: string | null;

    @ApiPropertyOptional({ type: Object, nullable: true, additionalProperties: true, example: { en: "Name" } })
    labelI18n: Prisma.JsonValue | null;

    @ApiPropertyOptional({ nullable: true, example: "Name", type: String, required: false })
    helpText: string | null;

    @ApiProperty({ example: true, type: Boolean })
    isActive: boolean;

    @ApiProperty({ example: true, type: Boolean })
    isSystem: boolean;

    @ApiProperty({ example: true, type: Boolean })
    isImmutable: boolean;

    @ApiProperty()
    deletableByPortal: boolean;

    @ApiProperty({ example: true, type: Boolean })
    customizableByPortal: boolean;

    @ApiProperty({ example: true, type: Boolean })
    hidden: boolean;

    @ApiPropertyOptional({ nullable: true, example: "Name", type: String, required: false })
    labelOverride: string | null;

    @ApiProperty({ example: true, type: Boolean })
    readOnlyOverride: boolean;

    @ApiPropertyOptional({ type: Object, nullable: true, additionalProperties: true })
    defaultValueJson: Prisma.JsonValue | null;

    @ApiPropertyOptional({ type: Object, nullable: true, additionalProperties: true })
    validationJson: Prisma.JsonValue | null;

    @ApiProperty({ example: true, type: Boolean })
    isMultiple: boolean;

    @ApiProperty({ example: 1, type: Number })
    sortOrder: number;

    @ApiProperty({ example: true, type: Boolean })
    showInFilters: boolean;

    @ApiProperty({ example: "2021-01-01T00:00:00.000Z", type: Date })
    createdAt: Date;

    @ApiProperty({ example: "2021-01-01T00:00:00.000Z", type: Date })
    updatedAt: Date;

    @ApiProperty({ type: [MemberFieldOptionResponseDto] })
    @Type(() => MemberFieldOptionResponseDto)
    options: MemberFieldOptionResponseDto[];
}

export class DeleteMemberFieldResponseDto {
    @ApiProperty({ example: true, type: Boolean })
    ok: true;
}

/** Ответ `PATCH .../member/forms/:purpose`. */
export class MemberFormLayoutReplaceResponseDto {
    @ApiProperty({ enum: FormPurpose, example: "public_registration" })
    purpose: FormPurpose;

    @ApiProperty({ description: "Число записей layout после замены" })
    replaced: number;
}

export class OrderStageResponseDto {
    @ApiProperty({ example: "123", type: String })
    id: string;

    @ApiProperty({ example: "123", type: String })
    stageCategoryId: string;

    @ApiProperty({ example: "Name", type: String })
    name: string;

    @ApiProperty()
    sortOrder: number;

    @ApiPropertyOptional({ nullable: true, example: "#000000", type: String, required: false })
    color: string | null;

    @ApiProperty({ enum: StageSemantic })
    semantic: StageSemantic;

    @ApiProperty({ example: true, type: Boolean })
    isTerminalSuccess: boolean;

    @ApiProperty({ example: true, type: Boolean })
    isTerminalFailure: boolean;

    @ApiProperty({ example: "2021-01-01T00:00:00.000Z", type: Date })
    createdAt: Date;

    @ApiProperty({ example: "2021-01-01T00:00:00.000Z", type: Date })
    updatedAt: Date;
}

export class OrderStageCategoryResponseDto {
    @ApiProperty({ example: "123", type: String })
    id: string;

    @ApiProperty({ example: "123", type: String })
    portalId: string;

    @ApiProperty({ example: "123", type: String })
    entityDefinitionId: string;

    @ApiProperty({ example: "name", type: String })
    code: string;

    @ApiProperty({ example: "Name", type: String})
    name: string;

    @ApiProperty({ example: true, type: Boolean })
    isDefault: boolean;

    @ApiProperty({ example: true, type: Boolean })
    isSystem: boolean;

    @ApiProperty({ example: true, type: Boolean })
    hiddenInUi: boolean;

    @ApiProperty({ example: "2021-01-01T00:00:00.000Z", type: Date })
    createdAt: Date;

    @ApiProperty({ example: "2021-01-01T00:00:00.000Z", type: Date })
    updatedAt: Date;

    @ApiProperty({ type: [OrderStageResponseDto] })
    @Type(() => OrderStageResponseDto)
    stages: OrderStageResponseDto[];
}
