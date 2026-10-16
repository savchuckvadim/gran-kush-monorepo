import { Injectable, NotFoundException } from "@nestjs/common";

import { PortalAppearanceRepository } from "../../domain/repositories/portal-appearance-repository.interface";

/**
 * Тема клуба по умолчанию (решение 10): её видят сотрудники в CRM и участники в кабинете, пока
 * не выбрали свою. Список тем живёт в CRM; API хранит id, а неизвестный id клиент заменяет темой
 * PafPaf — так новая тема не требует релиза API.
 */
@Injectable()
export class PortalAppearanceService {
    constructor(private readonly repository: PortalAppearanceRepository) {}

    async setDefaultSkin(portalId: string, skin: string | null): Promise<void> {
        const saved = await this.repository.saveDefaultSkin(portalId, skin);
        if (!saved) {
            throw new NotFoundException("Portal not found");
        }
    }
}
