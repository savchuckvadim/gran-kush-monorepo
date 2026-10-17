import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import type { Member } from "@prisma/client";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { CurrentMember } from "@modules/portal/auth/members";
import { CabinetAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";

import { MemberAccessService } from "../../application/services/member-access.service";
import { ShopAccessDto } from "../dto/club-policy.dto";

/** Открыт ли участнику каталог и заказ в клубе из адреса — чтобы кабинет объяснил, а не молчал. */
@ApiTags("Cabinet Shop Access")
@Controller("cabinet/club/shop-access")
@CabinetAuth()
export class CabinetShopAccessController {
    constructor(private readonly access: MemberAccessService) {}

    @Get()
    @ApiOperation({ summary: "Каталог и заказ: открыты ли и почему нет" })
    @ApiSuccessResponse(ShopAccessDto)
    @ApiErrorResponse([401, 403, 404])
    async get(@CurrentMember() member: Member): Promise<ShopAccessDto> {
        return this.access.evaluate(member.id, member.portalId);
    }
}
