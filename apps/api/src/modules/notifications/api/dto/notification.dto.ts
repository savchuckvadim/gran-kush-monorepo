import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Type } from "class-transformer";
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsInt,
    IsOptional,
    IsUUID,
    Max,
    Min,
} from "class-validator";

import { NOTIFICATION_PAGE } from "../../application/notifications.service";

/** Сколько уведомлений можно отметить прочитанными одним запросом. */
const MARK_READ_MAX = 100;

export class NotificationDto {
    @ApiProperty({ type: String, format: "uuid" })
    id!: string;

    @ApiProperty({
        type: String,
        example: "order.placed",
        description: "Тип: текст — `notifications.types.<type>` в i18n клиента",
    })
    type!: string;

    @ApiProperty({ type: String, example: "order", description: "О чём уведомление" })
    subjectKind!: string;

    @ApiProperty({ type: String, format: "uuid" })
    subjectId!: string;

    @ApiProperty({
        type: "object",
        additionalProperties: true,
        description: "Параметры текста: orderNumber, club, stage { label, labelI18n }…",
    })
    params!: Record<string, unknown>;

    @ApiProperty({ type: String, format: "date-time", nullable: true })
    readAt!: string | null;

    @ApiProperty({ type: String, format: "date-time" })
    createdAt!: string;
}

export class NotificationListDto {
    @ApiProperty({ type: () => [NotificationDto] })
    items!: NotificationDto[];

    @ApiProperty({ type: String, nullable: true, description: "Курсор следующей страницы" })
    nextCursor!: string | null;

    @ApiProperty({ type: Number, description: "Непрочитанных всего" })
    unread!: number;
}

export class NotificationListQueryDto {
    @ApiPropertyOptional({ type: String, format: "uuid" })
    @IsOptional()
    @IsUUID()
    cursor?: string;

    @ApiPropertyOptional({ type: Number, minimum: 1, maximum: NOTIFICATION_PAGE.max })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(NOTIFICATION_PAGE.max)
    limit?: number;
}

export class UnreadNotificationsDto {
    @ApiProperty({ type: Number })
    unread!: number;
}

export class MarkNotificationsReadDto {
    @ApiPropertyOptional({
        type: [String],
        description: "Какие отметить; без списка — все непрочитанные",
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MARK_READ_MAX)
    @IsUUID("all", { each: true })
    ids?: string[];
}

export class NotificationPreferencesDto {
    @ApiProperty({ type: Boolean, description: "Слать уведомления в Telegram" })
    telegram!: boolean;

    @ApiProperty({ type: Boolean, description: "Есть вход через Telegram — есть куда писать" })
    telegramLinked!: boolean;
}

export class UpdateNotificationPreferencesDto {
    @ApiProperty({ type: Boolean })
    @IsBoolean()
    telegram!: boolean;
}
