import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Type } from "class-transformer";
import {
    IsBoolean,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Length,
    Max,
    Min,
    ValidateIf,
} from "class-validator";

import { COMMENT_BODY_MAX, TIMELINE_PAGE } from "../../domain/timeline";

export class TimelineQueryDto {
    @ApiPropertyOptional({ type: String, description: "Курсор следующей страницы" })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({ type: Number, minimum: 1, maximum: TIMELINE_PAGE.max })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(TIMELINE_PAGE.max)
    limit?: number;

    @ApiPropertyOptional({
        enum: ["comments", "events"],
        description: "Только комментарии или события",
    })
    @IsOptional()
    @IsIn(["comments", "events"])
    only?: "comments" | "events";
}

export class TimelinePersonDto {
    @ApiProperty({ type: String })
    id!: string;

    @ApiProperty({ type: String })
    name!: string;
}

export class TimelineCommentDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty({ type: String, nullable: true, description: "null — комментарий удалён" })
    body!: string | null;

    @ApiProperty({ type: () => TimelinePersonDto, nullable: true })
    author!: TimelinePersonDto | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    pinnedAt!: string | null;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    editedAt!: string | null;

    @ApiProperty({ type: String, format: "date-time" })
    createdAt!: string;
}

export class TimelineActorDto {
    @ApiProperty({ type: String, example: "employee" })
    kind!: string;

    @ApiProperty({ type: String, nullable: true })
    id!: string | null;

    @ApiProperty({ type: String, nullable: true })
    name!: string | null;
}

export class TimelineEventDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty({ type: String, example: "order.stage_changed" })
    name!: string;

    @ApiProperty({ type: String, format: "date-time" })
    occurredAt!: string;

    @ApiProperty({ type: () => TimelineActorDto })
    actor!: TimelineActorDto;

    @ApiProperty({
        type: "object",
        additionalProperties: true,
        description: "Поля события и `labels`: подписи стадий и статусов по id",
    })
    data!: Record<string, unknown>;
}

export class TimelineEntryDto {
    @ApiProperty({ enum: ["event", "comment"] })
    kind!: "event" | "comment";

    @ApiProperty({ type: String })
    id!: string;

    @ApiProperty({ type: String, format: "date-time" })
    at!: string;

    @ApiPropertyOptional({ type: () => TimelineEventDto })
    event?: TimelineEventDto;

    @ApiPropertyOptional({ type: () => TimelineCommentDto })
    comment?: TimelineCommentDto;
}

export class TimelinePageDto {
    @ApiProperty({
        type: () => [TimelineCommentDto],
        description: "Закреплённые — на первой странице",
    })
    pinned!: TimelineCommentDto[];

    @ApiProperty({ type: () => [TimelineEntryDto] })
    entries!: TimelineEntryDto[];

    @ApiProperty({ type: String, nullable: true })
    nextCursor!: string | null;
}

export class CreateCommentDto {
    @ApiProperty({ type: String, maxLength: COMMENT_BODY_MAX })
    @IsString()
    @Length(1, COMMENT_BODY_MAX)
    body!: string;
}

export class UpdateCommentDto {
    @ApiPropertyOptional({ type: String, maxLength: COMMENT_BODY_MAX })
    @ValidateIf((dto: UpdateCommentDto) => dto.pinned === undefined || dto.body !== undefined)
    @IsString()
    @Length(1, COMMENT_BODY_MAX)
    body?: string;

    @ApiPropertyOptional({ type: Boolean, description: "Закрепить или открепить" })
    @IsOptional()
    @IsBoolean()
    pinned?: boolean;
}
