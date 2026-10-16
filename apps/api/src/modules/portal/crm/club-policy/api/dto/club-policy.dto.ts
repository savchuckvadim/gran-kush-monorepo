import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ClubJoinPolicy } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

import { ShopDenial } from "../../domain/club-policy";

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
