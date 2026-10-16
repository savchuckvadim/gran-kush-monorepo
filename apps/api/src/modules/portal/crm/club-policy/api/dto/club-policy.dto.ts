import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ClubJoinPolicy } from "@prisma/client";
import { IsBoolean, IsEnum, IsNumber, IsOptional, Max, Min } from "class-validator";

import { MAX_LIMIT_GRAMS, ShopDenial } from "../../domain/club-policy";

export class ClubPolicyDto {
    @ApiProperty({
        enum: ClubJoinPolicy,
        enumName: "ClubJoinPolicy",
        description:
            "link_only — только по ссылке клуба; approval — заявка из кабинета, клуб одобряет",
    })
    joinPolicy: ClubJoinPolicy;

    @ApiProperty({
        type: Boolean,
        description: "Каталог и заказ из кабинета, когда участник не в клубе",
    })
    catalogOutsideClub: boolean;

    @ApiProperty({ type: Boolean, description: "Заказ из кабинета только у одобренного участника" })
    ordersRequireApproval: boolean;

    @ApiProperty({ type: Boolean, description: "Сотрудник может оформить заказ на себя" })
    staffSelfOrders: boolean;

    @ApiProperty({
        type: Boolean,
        description: "Лимит отпуска за последние 30 дней включён",
    })
    monthlyLimitEnabled: boolean;

    @ApiProperty({
        type: Number,
        nullable: true,
        example: 60,
        description: "Лимит в граммах для участников без личного; null — без лимита",
    })
    defaultMonthlyLimitGrams: number | null;
}

export class UpdateClubPolicyDto {
    @ApiPropertyOptional({ enum: ClubJoinPolicy, enumName: "ClubJoinPolicy" })
    @IsOptional()
    @IsEnum(ClubJoinPolicy)
    joinPolicy?: ClubJoinPolicy;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    catalogOutsideClub?: boolean;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    ordersRequireApproval?: boolean;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    staffSelfOrders?: boolean;

    @ApiPropertyOptional({ type: Boolean })
    @IsOptional()
    @IsBoolean()
    monthlyLimitEnabled?: boolean;

    @ApiPropertyOptional({ type: Number, nullable: true, description: "null — без лимита" })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 3 })
    @Min(0)
    @Max(MAX_LIMIT_GRAMS)
    defaultMonthlyLimitGrams?: number | null;
}

export class ShopAccessDto {
    @ApiProperty({ type: Boolean, description: "Каталог открыт" })
    canBrowse: boolean;

    @ApiProperty({ type: Boolean, description: "Можно оформить заказ" })
    canOrder: boolean;

    @ApiProperty({
        enum: ShopDenial,
        enumName: "ShopDenial",
        isArray: true,
        description:
            "Почему закрыто: not_in_club — нет открытого визита; not_approved — клуб ещё не одобрил; " +
            "club_subscription_inactive — подписка клуба не действует",
    })
    reasons: ShopDenial[];
}
