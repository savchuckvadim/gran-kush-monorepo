import { Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { RequireMemberJwt } from "@modules/portal/auth/members";
import { CurrentMember } from "@modules/portal/auth/members/api/decorators/current-member.decorator";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";
import { QrCodeWithPayloadDto } from "@modules/portal/crm/qr-codes/api/dto/qr-code.dto";
import { mapQrCodeToPayloadDto } from "@modules/portal/crm/qr-codes/api/mappers";
import { QrCodesService } from "@modules/portal/crm/qr-codes/application/services/qr-codes.service";

/** QR участника в кабинете: только свой код в клубе из адреса. */
@ApiTags("Cabinet QR Codes")
@Controller("cabinet/qr-code")
@RequireMemberJwt()
@ApiBearerAuth()
export class CabinetQrCodesController {
    constructor(private readonly qrCodesService: QrCodesService) {}

    // ─── Получить свой QR-код ────────────────────────────────────────────────

    @Get()
    @ApiOperation({
        summary: "Получить свой QR-код",
        description:
            "Возвращает действующий QR-код участника в текущем клубе (клуб — заголовок X-Portal-*). " +
            "Если кода ещё нет или срок вышел, выдаёт новый: просить администратора не нужно. " +
            "Строку encryptedCode нужно закодировать в QR-изображение на клиенте.",
    })
    @ApiSuccessResponse(QrCodeWithPayloadDto)
    @ApiErrorResponse([400, 401, 403])
    async getMyQrCode(@CurrentMember() member: Member): Promise<QrCodeWithPayloadDto> {
        const qr = await this.qrCodesService.ensureCurrent(member.id, member.portalId);
        return mapQrCodeToPayloadDto(qr);
    }

    // ─── Запросить перегенерацию QR-кода ─────────────────────────────────────

    @Post("regenerate")
    @ApiOperation({
        summary: "Запросить перегенерацию QR-кода",
        description:
            "Перевыпускает QR-код участника в текущем клубе. Прежний код сразу перестаёт " +
            "приниматься: используйте, если скриншот кода попал не туда.",
    })
    @ApiSuccessResponse(QrCodeWithPayloadDto)
    @ApiErrorResponse([400, 401, 403])
    async regenerateMyQrCode(@CurrentMember() member: Member): Promise<QrCodeWithPayloadDto> {
        const qr = await this.qrCodesService.generateOrRegenerate(member.id, member.portalId);
        return mapQrCodeToPayloadDto(qr);
    }
}
