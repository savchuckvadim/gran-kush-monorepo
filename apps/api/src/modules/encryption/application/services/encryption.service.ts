import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import * as crypto from "crypto";

/**
 * Сервис шифрования чувствительных данных (AES-256-GCM)
 *
 * Используется для шифрования:
 * - QR-кодов членов клуба
 * - Других чувствительных данных в БД
 *
 * Формат зашифрованных данных: iv:authTag:ciphertext (hex)
 */
@Injectable()
export class EncryptionService {
    private readonly logger = new Logger(EncryptionService.name);
    private readonly algorithm = "aes-256-gcm";
    private readonly keyLength = 32; // 256 бит
    private readonly ivLength = 16; // 128 бит
    private readonly authTagLength = 16; // 128 бит
    private readonly encryptionKey: Buffer;

    constructor(private readonly configService: ConfigService) {
        const keyHex = this.configService.get<string>("ENCRYPTION_MASTER_KEY");

        if (!keyHex) {
            this.logger.warn(
                "⚠️ ENCRYPTION_MASTER_KEY is not set! Generating a random key. " +
                    "THIS IS NOT SUITABLE FOR PRODUCTION. " +
                    "Set ENCRYPTION_MASTER_KEY env variable (64 hex chars = 32 bytes)."
            );
            this.encryptionKey = crypto.randomBytes(this.keyLength);
        } else {
            if (keyHex.length !== 64) {
                throw new Error(
                    `ENCRYPTION_MASTER_KEY must be 64 hex characters (32 bytes). Got ${keyHex.length} chars.`
                );
            }
            this.encryptionKey = Buffer.from(keyHex, "hex");
        }
    }

    /**
     * Шифрование строки
     * @param plaintext - Исходная строка
     * @returns Зашифрованная строка в формате iv:authTag:ciphertext (hex)
     */
    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv, {
            authTagLength: this.authTagLength,
        });

        let encrypted = cipher.update(plaintext, "utf8", "hex");
        encrypted += cipher.final("hex");

        const authTag = cipher.getAuthTag();

        return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    }

    /**
     * Дешифрование строки
     * @param encryptedData - Зашифрованная строка в формате iv:authTag:ciphertext (hex)
     * @returns Расшифрованная строка
     * @throws Error если данные невалидны или повреждены
     */
    decrypt(encryptedData: string): string {
        const parts = encryptedData.split(":");
        if (parts.length !== 3) {
            throw new Error("Invalid encrypted data format. Expected iv:authTag:ciphertext");
        }

        const [ivHex, authTagHex, ciphertext] = parts;

        const iv = Buffer.from(ivHex, "hex");
        const authTag = Buffer.from(authTagHex, "hex");

        const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv, {
            authTagLength: this.authTagLength,
        });

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    }

    /**
     * Генерация криптографически стойкого случайного токена
     * @param length - Длина в байтах (по умолчанию 32)
     * @returns Hex-строка
     */
    generateRandomToken(length: number = 32): string {
        return crypto.randomBytes(length).toString("hex");
    }
}
