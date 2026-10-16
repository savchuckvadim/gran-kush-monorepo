/** Оформление клуба: тема по умолчанию для его сотрудников и участников. */
export abstract class PortalAppearanceRepository {
    /** Сохранить тему клуба (`null` — тема PafPaf); `false`, если клуба нет. */
    abstract saveDefaultSkin(portalId: string, skin: string | null): Promise<boolean>;
}
