import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";

import { OperationsService } from "../../application/operations.service";
import { OperationDto, toOperationDto } from "../dto/operation.dto";

/** Мои фоновые операции в клубе: запасной опрос к сокету и чтение результата. */
@ApiTags("CRM Operations")
@Controller("crm/operations")
@CrmAuth({ subscription: false })
@ApiBearerAuth()
export class CrmOperationsController {
    constructor(private readonly operations: OperationsService) {}

    @Get(":id")
    @ApiOperation({
        summary: "Моя фоновая операция: статус, результат или причина сбоя",
        description: "Операцию видит только её автор в своём клубе; остальным — 404",
    })
    @ApiSuccessResponse(OperationDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async get(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Param("id", ParseUUIDPipe) id: string
    ): Promise<OperationDto> {
        return toOperationDto(
            await this.operations.getForRequester(id, portalId, principal.membershipId)
        );
    }
}
