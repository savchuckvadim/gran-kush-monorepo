/** Завёрнутый ключ данных портала одной цели и версии. */
export interface StoredPortalDataKey {
    version: number;
    wrappedKey: string;
    kekVersion: number;
}

/** Ключи данных порталов (`portal_data_keys`). */
export abstract class PortalDataKeyRepository {
    /** Самая свежая версия ключа цели; `null` — ключа ещё нет. */
    abstract findLatest(portalId: string, purpose: string): Promise<StoredPortalDataKey | null>;

    abstract findVersion(
        portalId: string,
        purpose: string,
        version: number
    ): Promise<StoredPortalDataKey | null>;

    /**
     * Сохранить первую версию ключа, если её ещё нет. Параллельный запрос мог успеть первым: тогда
     * его ключ остаётся, наш выбрасывается — вызывающий перечитывает сохранённый.
     */
    abstract createFirstIfMissing(
        portalId: string,
        purpose: string,
        key: StoredPortalDataKey
    ): Promise<void>;
}
