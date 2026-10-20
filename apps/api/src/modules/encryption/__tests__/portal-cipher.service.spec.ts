import type { ConfigService } from "@nestjs/config";

import { EncryptionService } from "@encryption/application/services/encryption.service";
import { PortalCipherService } from "@encryption/application/services/portal-cipher.service";
import {
    PortalDataKeyRepository,
    type StoredPortalDataKey,
} from "@encryption/domain/portal-data-key.repository";

/** Хранилище ключей в памяти; `slowFirstRead` имитирует гонку двух первых запросов. */
class MemoryKeys extends PortalDataKeyRepository {
    readonly rows = new Map<string, StoredPortalDataKey>();
    creates = 0;

    findLatest(portalId: string, purpose: string): Promise<StoredPortalDataKey | null> {
        return Promise.resolve(this.rows.get(`${portalId}:${purpose}`) ?? null);
    }

    findVersion(portalId: string, purpose: string, version: number) {
        const row = this.rows.get(`${portalId}:${purpose}`);
        return Promise.resolve(row && row.version === version ? row : null);
    }

    createFirstIfMissing(portalId: string, purpose: string, key: StoredPortalDataKey) {
        this.creates += 1;
        const id = `${portalId}:${purpose}`;
        if (!this.rows.has(id)) this.rows.set(id, key);
        return Promise.resolve();
    }
}

const encryption = () =>
    new EncryptionService({ get: () => "ab".repeat(32) } as unknown as ConfigService);

describe("PortalCipherService", () => {
    it("шифрует и расшифровывает; шифротекст не содержит данных", async () => {
        const cipher = new PortalCipherService(encryption(), new MemoryKeys());
        const sealed = await cipher.encryptJson("p1", "finance", "profile", { taxId: "G12345674" });

        expect(sealed.startsWith("pc1.1.")).toBe(true);
        expect(sealed).not.toContain("G12345674");
        await expect(cipher.decryptJson("p1", "finance", "profile", sealed)).resolves.toEqual({
            taxId: "G12345674",
        });
    });

    it("шифротекст другой записи или другого портала не расшифровывается", async () => {
        const cipher = new PortalCipherService(encryption(), new MemoryKeys());
        const sealed = await cipher.encrypt("p1", "finance", "entry-1", "100.00");

        await expect(cipher.decrypt("p1", "finance", "entry-2", sealed)).rejects.toThrow();
        await expect(cipher.decrypt("p2", "finance", "entry-1", sealed)).rejects.toThrow();
    });

    it("у порталов разные ключи; в базе ключ лежит завёрнутым", async () => {
        const keys = new MemoryKeys();
        const cipher = new PortalCipherService(encryption(), keys);
        await cipher.encrypt("p1", "finance", "x", "a");
        await cipher.encrypt("p2", "finance", "x", "a");

        const [k1, k2] = [keys.rows.get("p1:finance"), keys.rows.get("p2:finance")];
        expect(k1?.wrappedKey).not.toBe(k2?.wrappedKey);
        expect(k1?.wrappedKey.split(".")).toHaveLength(3);
    });

    it("параллельные первые запросы сходятся на одном ключе", async () => {
        const keys = new MemoryKeys();
        const first = new PortalCipherService(encryption(), keys);
        const second = new PortalCipherService(encryption(), keys);

        const [a, b] = await Promise.all([
            first.encrypt("p1", "finance", "x", "secret"),
            second.encrypt("p1", "finance", "x", "secret"),
        ]);
        await expect(second.decrypt("p1", "finance", "x", a)).resolves.toBe("secret");
        await expect(first.decrypt("p1", "finance", "x", b)).resolves.toBe("secret");
        expect(keys.rows.size).toBe(1);
    });

    it("файл шифруется двоичным форматом и открывается только в своём контексте", async () => {
        const cipher = new PortalCipherService(encryption(), new MemoryKeys());
        const file = Buffer.from("%PDF-1.7 receipt 42.00 EUR");
        const sealed = await cipher.encryptBytes("p1", "finance", "entry-1", file);

        expect(sealed.subarray(0, 4).toString("ascii")).toBe("PCB1");
        expect(sealed.includes(Buffer.from("receipt"))).toBe(false);
        await expect(cipher.decryptBytes("p1", "finance", "entry-1", sealed)).resolves.toEqual(
            file
        );
        await expect(cipher.decryptBytes("p1", "finance", "entry-2", sealed)).rejects.toThrow();
        await expect(
            cipher.decryptBytes("p1", "finance", "entry-1", Buffer.from("PCB1"))
        ).rejects.toThrow("Invalid portal sealed file format");
    });

    it("слепой индекс стабилен в портале и различается между порталами", async () => {
        const cipher = new PortalCipherService(encryption(), new MemoryKeys());
        const a1 = await cipher.blindIndex("p1", "finance", "B12345674");
        const a2 = await cipher.blindIndex("p1", "finance", "B12345674");
        const b = await cipher.blindIndex("p2", "finance", "B12345674");

        expect(a1).toBe(a2);
        expect(a1).not.toBe(b);
        expect(a1).not.toContain("B12345674");
    });
});
