import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import {
    IsBoolean,
    IsInt,
    IsLatitude,
    IsLongitude,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from "class-validator";

export class PublicPortalMapItemDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: String, example: "green-club" })
    slug: string;

    @ApiProperty({ type: String, example: "Green Club" })
    displayName: string;

    @ApiPropertyOptional({ type: String, nullable: true })
    publicDescription?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    coverImageUrl?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    address?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    city?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    country?: string | null;

    @ApiPropertyOptional({ type: Number, nullable: true })
    latitude?: number | null;

    @ApiPropertyOptional({ type: Number, nullable: true })
    longitude?: number | null;

    @ApiProperty({ type: Number, nullable: true, description: "Средний рейтинг клуба (1-5)" })
    averageRating: number | null;

    @ApiProperty({ type: Number })
    reviewsCount: number;
}

export class PublicPortalsMapResponseDto {
    @ApiProperty({ type: [PublicPortalMapItemDto] })
    portals: PublicPortalMapItemDto[];
}

export class UpdatePortalSettingsDto {
    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    displayName?: string;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    publicDescription?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    coverImageUrl?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    city?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    country?: string | null;

    @ApiPropertyOptional({ type: Number, nullable: true })
    @IsOptional()
    @IsNumber()
    @IsLatitude()
    latitude?: number | null;

    @ApiPropertyOptional({ type: Number, nullable: true })
    @IsOptional()
    @IsNumber()
    @IsLongitude()
    longitude?: number | null;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    isListedOnMap?: boolean;
}

export class PortalSettingsDto extends PublicPortalMapItemDto {
    @ApiProperty({ type: Boolean })
    isListedOnMap: boolean;
}

export class CreateReviewDto {
    @ApiProperty({ type: Number, example: 5, minimum: 1, maximum: 5 })
    @IsInt()
    @Min(1)
    @Max(5)
    score: number;

    @ApiPropertyOptional({ type: String })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    comment?: string;
}

export class ReviewDto {
    @ApiProperty({ type: String })
    id: string;

    @ApiProperty({ type: Number, example: 5 })
    score: number;

    @ApiProperty({ type: String, nullable: true })
    comment: string | null;

    @ApiProperty({ type: String })
    createdAt: string;
}

export class SpendingByPortalDto {
    @ApiProperty({ type: String })
    portalId: string;

    @ApiProperty({ type: String, example: "green-club" })
    slug: string;

    @ApiProperty({ type: String, example: "Green Club" })
    displayName: string;

    @ApiProperty({ type: Number })
    ordersCount: number;

    @ApiProperty({ type: String, example: "125.50", description: "Сумма total по заказам" })
    totalSpent: string;
}

export class MySpendingResponseDto {
    @ApiProperty({ type: [SpendingByPortalDto] })
    byPortal: SpendingByPortalDto[];

    @ApiProperty({ type: String, example: "250.00" })
    totalSpent: string;

    @ApiProperty({ type: Number })
    totalOrders: number;
}
