import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { IsBoolean, IsObject, IsOptional, IsString } from "class-validator";

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
