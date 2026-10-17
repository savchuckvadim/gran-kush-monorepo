import { ApiProperty, ApiPropertyOptional, IntersectionType } from "@nestjs/swagger";

import { Type } from "class-transformer";
import {
    IsBoolean,
    IsIn,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from "class-validator";

import { EntityFilterDto } from "@modules/portal/crm/entity-fields/api/dto/entity-filter.dto";
import {
    ENTITY_RECORD_LIST_SORTS,
    type EntityRecordListSort,
} from "@modules/portal/crm/records/domain/entity-record-list";

export class EntityRecordListPageDto {
    @ApiPropertyOptional({ type: Number, default: 50, minimum: 1, maximum: 200 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(200)
    limit?: number = 50;

    @ApiPropertyOptional({ type: Number, default: 0, minimum: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    skip?: number = 0;

    @ApiPropertyOptional({ type: String, format: "uuid" })
    @IsOptional()
    @IsUUID()
    stageId?: string;

    @ApiPropertyOptional({ type: String, format: "uuid", description: "Воронка: записи её стадий" })
    @IsOptional()
    @IsUUID()
    stageCategoryId?: string;

    @ApiPropertyOptional({ type: String, format: "uuid" })
    @IsOptional()
    @IsUUID()
    statusItemId?: string;

    @ApiPropertyOptional({
        enum: ENTITY_RECORD_LIST_SORTS,
        default: "createdAt",
        description: "createdAt — новые сверху; stagePosition — порядок карточек в колонке канбана",
    })
    @IsOptional()
    @IsIn(ENTITY_RECORD_LIST_SORTS)
    sortBy?: EntityRecordListSort;
}

/** GET /crm/entities/:code/records: limit/skip, стадия или воронка, статус, порядок, поиск `q` и условия `filter`. */
export class EntityRecordListQueryDto extends IntersectionType(
    EntityRecordListPageDto,
    EntityFilterDto
) {}

export class EntityRecordFieldDto {
    @ApiProperty({ type: String, example: "title" })
    fieldKey: string;

    @ApiProperty({ type: String, example: "string" })
    type: string;

    @ApiProperty({ type: String, nullable: true })
    label: string | null;

    @ApiProperty({ type: Object })
    value: unknown;
}

export class EntityRecordStageDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String, description: "Воронка стадии" })
    stageCategoryId: string;

    @ApiProperty({ type: String })
    name: string;

    @ApiProperty({ type: String, nullable: true })
    color: string | null;

    @ApiProperty({ type: String, example: "IN_PROGRESS" })
    semantic: string;
}

export class EntityRecordStatusDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String })
    key: string;

    @ApiProperty({ type: String })
    label: string;

    @ApiProperty({ type: String, nullable: true })
    color: string | null;
}

export class EntityRecordRelationDto {
    @ApiProperty({ type: String, example: "linked_member" })
    fieldKey: string;

    @ApiProperty({ type: [String] })
    targetRecordIds: string[];
}

export class EntityRecordDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String, example: "deal" })
    entityCode: string;

    @ApiProperty({ type: Boolean })
    isActive: boolean;

    @ApiProperty({ type: EntityRecordStageDto, nullable: true })
    stage: EntityRecordStageDto | null;

    @ApiProperty({ type: EntityRecordStatusDto, nullable: true })
    statusItem: EntityRecordStatusDto | null;

    @ApiProperty({ type: [EntityRecordFieldDto] })
    fields: EntityRecordFieldDto[];

    @ApiProperty({ type: [EntityRecordRelationDto] })
    relations: EntityRecordRelationDto[];

    @ApiProperty({ type: String })
    createdAt: string;

    @ApiProperty({ type: String })
    updatedAt: string;
}

export class EntityRecordListResponseDto {
    @ApiProperty({ type: [EntityRecordDto] })
    items: EntityRecordDto[];

    @ApiProperty({ type: Number })
    total: number;
}

export class CreateEntityRecordDto {
    @ApiProperty({
        type: "object",
        additionalProperties: true,
        description: "fieldKey → value; relation-поля принимают id записи или массив id",
    })
    @IsObject()
    fields: Record<string, unknown>;

    @ApiPropertyOptional({
        type: String,
        format: "uuid",
        description: "Стадия новой записи; по умолчанию — первая стадия воронки по умолчанию",
    })
    @IsOptional()
    @IsUUID()
    stageId?: string;
}

export class UpdateEntityRecordDto {
    @ApiPropertyOptional({ type: "object", additionalProperties: true })
    @IsOptional()
    @IsObject()
    fields?: Record<string, unknown>;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class SetRecordStageDto {
    @ApiProperty({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    stageId: string | null;

    @ApiPropertyOptional({
        type: String,
        format: "uuid",
        nullable: true,
        description:
            "Сосед сверху в колонке: карточка встаёт сразу под ним; null — наверх. Не передан: смена стадии ставит наверх, та же стадия — без изменений",
    })
    @IsOptional()
    @IsUUID()
    afterId?: string | null;
}

export class SetRecordStatusDto {
    @ApiProperty({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    statusItemId: string | null;
}

export class DeleteRecordResponseDto {
    @ApiProperty({ type: Boolean })
    deleted: boolean;
}
