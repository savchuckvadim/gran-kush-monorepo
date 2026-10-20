import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal/portal-principal.types";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { mapProductToListDto } from "@modules/portal/crm/catalog/api/mappers/product.mapper";

import { ResolveScanUseCase } from "../../application/use-cases/resolve-scan.use-case";
import { ResolveScanDto, ScanResolutionDto } from "../dto/scan.dto";

@ApiTags("CRM Scan")
@Controller("crm/scan")
@CrmAuth()
@ApiBearerAuth()
export class CrmScanController {
    constructor(private readonly resolveScan: ResolveScanUseCase) {}

    @Post("resolve")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: "Что прочитал сканер: участник, товар клуба или неизвестный код",
        description:
            "Этикетка `P-<код>` и штрихкод ищутся только в клубе запроса. Код входа участника " +
            "возвращает предпросмотр стойки и требует presence.checkin, orders.create или " +
            "members.read. Ничего не записывает.",
    })
    @ApiSuccessResponse(ScanResolutionDto)
    @ApiErrorResponse([400, 401, 403])
    async resolve(
        @Body() dto: ResolveScanDto,
        @CurrentPrincipal() principal: PortalPrincipal
    ): Promise<ScanResolutionDto> {
        const result = await this.resolveScan.execute(
            principal.portalId,
            principal.permissions,
            dto.code
        );
        return result.kind === "product"
            ? { kind: "product", product: mapProductToListDto(result.product) }
            : result;
    }
}
