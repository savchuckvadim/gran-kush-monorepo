import { ForbiddenException, Injectable } from "@nestjs/common";

import { type Permission, PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";
import { ProductsService } from "@modules/portal/crm/catalog/application/services/products.service";
import type { Product } from "@modules/portal/crm/catalog/domain/entity/product.entity";
import { PresenceService } from "@modules/portal/crm/presence/application/services/presence.service";

import { classifyScan } from "../../domain/scanned-code";

export type DoorPreview = Awaited<ReturnType<PresenceService["previewQrScan"]>>;

export type ScanResolution =
    | { kind: "member"; member: DoorPreview }
    | { kind: "product"; product: Product }
    | { kind: "unknown"; reason: "product_not_found" | "unrecognized" };

/** Участника по коду входа видят стойка, оформление заказа и карточки участников. */
export const MEMBER_SCAN_PERMISSIONS: readonly Permission[] = [
    PERMISSIONS.PresenceCheckin,
    PERMISSIONS.OrdersCreate,
    PERMISSIONS.MembersRead,
];

/**
 * Код со сканера CRM (TASK-807) — участник или товар клуба запроса.
 * - этикетка (`P-…`) и штрихкод упаковки ищутся только в этом клубе: этикетка другого клуба и
 *   удалённый товар — `unknown` / `product_not_found`; каталог открыт любому сотруднику;
 * - код входа участника — предпросмотр стойки (кто, в клубе ли, вход или выход) без записи;
 *   нужен один из `MEMBER_SCAN_PERMISSIONS`, иначе 403;
 * - нераспознанная строка — `unknown` / `unrecognized`.
 * Что делать с найденным, решает экран, где открыт сканер: заказ, склад или стойка.
 */
@Injectable()
export class ResolveScanUseCase {
    constructor(
        private readonly products: ProductsService,
        private readonly presence: PresenceService
    ) {}

    async execute(
        portalId: string,
        permissions: readonly Permission[],
        raw: string
    ): Promise<ScanResolution> {
        const scanned = classifyScan(raw);
        switch (scanned.kind) {
            case "product":
                return found(await this.products.findByCode(scanned.code, portalId));
            case "barcode":
                return found(await this.products.findByBarcode(scanned.barcode, portalId));
            case "member":
                if (!MEMBER_SCAN_PERMISSIONS.some((code) => permissions.includes(code))) {
                    throw new ForbiddenException({
                        message: "Not enough permissions",
                        code: "missing_permission",
                        errors: MEMBER_SCAN_PERMISSIONS,
                    });
                }
                return {
                    kind: "member",
                    member: await this.presence.previewQrScan(scanned.token, portalId),
                };
            case "unrecognized":
                return { kind: "unknown", reason: "unrecognized" };
        }
    }
}

const found = (product: Product | null): ScanResolution =>
    product ? { kind: "product", product } : { kind: "unknown", reason: "product_not_found" };
