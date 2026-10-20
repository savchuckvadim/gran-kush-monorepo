import { Injectable } from "@nestjs/common";

import * as crypto from "crypto";

import { PortalDataKeyRepository } from "../../domain/portal-data-key.repository";

import { EncryptionService } from "./encryption.service";

/** Цели ключей данных портала: у каждой свой ключ, утечка одного не раскрывает другие данные. */
export const PORTAL_CIPHER_PURPOSES = {
    finance: "finance",
} as const;
export type PortalCipherPurpose =
    (typeof PORTAL_CIPHER_PURPOSES)[keyof typeof PORTAL_CIPHER_PURPOSES];

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const FORMAT = "pc1";
/** Цель HKDF для заворачивания ключей данных порталов мастер-ключом */
const WRAP_PURPOSE = "portal-data-key-wrap";
const KEK_VERSION = 1;
/** Цель HKDF для «слепого индекса» внутри ключа портала */
const BLIND_INDEX_INFO = "blind-index";

/**
 * Шифрование данных портала (envelope, TASK-796). У портала и цели свой случайный ключ AES-256,
 * завёрнутый мастер-ключом (`portal_data_keys`): мастер-ключ шифрует только ключи, данные — ключ
 * портала. Формат шифротекста — `pc1.<версия ключа>.<iv>.<tag>.<данные>` (base64url).
 *
 * `context` (например, `organization_profile` или id записи) входит в AAD вместе с порталом и
 * целью: шифротекст, перенесённый в другую строку или другой портал, не расшифруется.
 */
@Injectable()
export class PortalCipherService {
    private readonly keys = new Map<string, Buffer>();

    constructor(
        private readonly encryption: EncryptionService,
        private readonly repository: PortalDataKeyRepository
    ) {}

    async encrypt(
        portalId: string,
        purpose: PortalCipherPurpose,
        context: string,
        plaintext: string
    ): Promise<string> {
        const { version, key } = await this.currentKey(portalId, purpose);
        const iv = crypto.randomBytes(IV_BYTES);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
        cipher.setAAD(this.aad(portalId, purpose, context));
        const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
        return [
            FORMAT,
            String(version),
            ...[iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")),
        ].join(".");
    }

    async decrypt(
        portalId: string,
        purpose: PortalCipherPurpose,
        context: string,
        ciphertext: string
    ): Promise<string> {
        const parts = ciphertext.split(".");
        if (parts.length !== 5 || parts[0] !== FORMAT) {
            throw new Error("Invalid portal ciphertext format");
        }
        const version = Number(parts[1]);
        const [iv, tag, data] = parts.slice(2).map((part) => Buffer.from(part, "base64url"));
        const key = await this.keyVersion(portalId, purpose, version);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
        decipher.setAAD(this.aad(portalId, purpose, context));
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    }

    async encryptJson(
        portalId: string,
        purpose: PortalCipherPurpose,
        context: string,
        value: unknown
    ): Promise<string> {
        return this.encrypt(portalId, purpose, context, JSON.stringify(value));
    }

    async decryptJson<T>(
        portalId: string,
        purpose: PortalCipherPurpose,
        context: string,
        ciphertext: string
    ): Promise<T> {
        return JSON.parse(await this.decrypt(portalId, purpose, context, ciphertext)) as T;
    }

    /**
     * «Слепой индекс»: HMAC значения ключом портала. По нему ищут и ловят дубли (NIF контрагента),
     * не храня значение открыто; у другого портала то же значение даёт другой индекс.
     */
    async blindIndex(
        portalId: string,
        purpose: PortalCipherPurpose,
        value: string
    ): Promise<string> {
        const { key } = await this.currentKey(portalId, purpose);
        const indexKey = Buffer.from(
            crypto.hkdfSync("sha256", key, Buffer.alloc(0), BLIND_INDEX_INFO, KEY_BYTES)
        );
        return crypto.createHmac("sha256", indexKey).update(value).digest("base64url");
    }

    private aad(portalId: string, purpose: string, context: string): Buffer {
        return Buffer.from(`${portalId}|${purpose}|${context}`, "utf8");
    }

    private async currentKey(
        portalId: string,
        purpose: PortalCipherPurpose
    ): Promise<{ version: number; key: Buffer }> {
        let stored = await this.repository.findLatest(portalId, purpose);
        if (!stored) {
            const key = crypto.randomBytes(KEY_BYTES);
            await this.repository.createFirstIfMissing(portalId, purpose, {
                version: 1,
                wrappedKey: this.encryption.wrapKey(WRAP_PURPOSE, key),
                kekVersion: KEK_VERSION,
            });
            // параллельный запрос мог сохранить свой ключ первым — берём сохранённый
            stored = await this.repository.findLatest(portalId, purpose);
            if (!stored) throw new Error("Portal data key was not stored");
        }
        return { version: stored.version, key: this.unwrapCached(portalId, purpose, stored) };
    }

    private async keyVersion(
        portalId: string,
        purpose: PortalCipherPurpose,
        version: number
    ): Promise<Buffer> {
        const cached = this.keys.get(this.cacheKey(portalId, purpose, version));
        if (cached) return cached;
        const stored = await this.repository.findVersion(portalId, purpose, version);
        if (!stored) throw new Error("Portal data key version not found");
        return this.unwrapCached(portalId, purpose, stored);
    }

    private unwrapCached(
        portalId: string,
        purpose: string,
        stored: { version: number; wrappedKey: string }
    ): Buffer {
        const cacheKey = this.cacheKey(portalId, purpose, stored.version);
        let key = this.keys.get(cacheKey);
        if (!key) {
            key = this.encryption.unwrapKey(WRAP_PURPOSE, stored.wrappedKey);
            this.keys.set(cacheKey, key);
        }
        return key;
    }

    private cacheKey(portalId: string, purpose: string, version: number): string {
        return `${portalId}:${purpose}:${version}`;
    }
}
