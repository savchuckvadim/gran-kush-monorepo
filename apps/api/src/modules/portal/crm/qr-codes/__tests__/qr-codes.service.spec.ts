import { BadRequestException } from "@nestjs/common";

import { MemberConsentStatus, Prisma } from "@prisma/client";
import { randomBytes } from "crypto";

import { QrCodesService } from "../application/services/qr-codes.service";
import { QrCode } from "../domain/entity/qr-code.entity";

const PORTAL = "portal-a";
const OTHER_PORTAL = "portal-b";
const MEMBER_ID = "member-1";

type MemberState = {
    portalId: string;
    isActive: boolean;
    consentStatus: MemberConsentStatus;
};

/**
 * Шифрование заменено обратимой заглушкой: настоящий AES-GCM здесь не нужен, важны два свойства —
 * каждая выдача даёт НОВУЮ строку (как случайный IV) и чужую строку нельзя расшифровать.
 */
const fakeEncryption = {
    encrypt: (plain: string) =>
        `enc.${randomBytes(8).toString("hex")}.${Buffer.from(plain).toString("base64")}`,
    decrypt: (cipher: string) => {
        if (!cipher.startsWith("enc.")) throw new Error("bad cipher");
        return Buffer.from(cipher.split(".")[2] ?? "", "base64").toString();
    },
};

const build = (initial: Partial<MemberState> = {}) => {
    const state: MemberState = {
        portalId: PORTAL,
        isActive: true,
        consentStatus: MemberConsentStatus.confirmed,
        ...initial,
    };
    type Row = { id: string; encryptedCode: string; expiresAt: Date };
    const rows = new Map<string, Row>();
    let failNextCreateWithRace = false;

    const toEntity = (row: { id: string; encryptedCode: string; expiresAt: Date }): QrCode =>
        new QrCode({
            id: row.id,
            memberId: MEMBER_ID,
            encryptedCode: row.encryptedCode,
            expiresAt: row.expiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
            member: {
                id: MEMBER_ID,
                portalId: state.portalId,
                name: "Ana",
                surname: "Lopez",
                membershipNumber: "42",
                isActive: state.isActive,
                consentStatus: state.consentStatus,
            },
        });

    const repository = {
        findById: jest.fn(async (id: string) => {
            const row = rows.get(id);
            return row ? toEntity(row) : null;
        }),
        findByMemberId: jest.fn(async () => {
            const row = [...rows.values()][0];
            return row ? toEntity(row) : null;
        }),
        create: jest.fn(async (data: { id?: string; encryptedCode: string; expiresAt: Date }) => {
            if (failNextCreateWithRace) {
                failNextCreateWithRace = false;
                // Параллельный запрос успел вставить строку раньше
                rows.set("winner", {
                    id: "winner",
                    encryptedCode: "enc.winner.e30=",
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
                });
                throw new Prisma.PrismaClientKnownRequestError("duplicate", {
                    code: "P2002",
                    clientVersion: "test",
                    meta: { target: ["entity_record_id"] },
                });
            }
            const row = { id: data.id ?? "generated", ...data };
            rows.set(row.id, row);
            return toEntity(row);
        }),
        update: jest.fn(async (id: string, data: { encryptedCode: string; expiresAt: Date }) => {
            const row = { id, ...data };
            rows.set(id, row);
            return toEntity(row);
        }),
        delete: jest.fn(async (id: string) => {
            rows.delete(id);
        }),
    };

    const members = {
        findByIdForPortal: jest.fn(async (_id: string, portalId: string) =>
            portalId === state.portalId
                ? { id: MEMBER_ID, isActive: state.isActive, consentStatus: state.consentStatus }
                : null
        ),
        toCrmMemberListDto: jest.fn(() => ({ name: "Ana" })),
    };

    const config = { get: jest.fn(() => undefined) };

    const service = new QrCodesService(
        repository as never,
        fakeEncryption as never,
        members as never,
        config as never
    );

    return {
        service,
        repository,
        rows,
        state,
        raceOnNextCreate: () => {
            failNextCreateWithRace = true;
        },
    };
};

describe("QrCodesService — выдача", () => {
    it("первая выдача пишет одну строку сразу с финальным кодом, без «временной»", async () => {
        const { service, repository } = build();
        const qr = await service.generateOrRegenerate(MEMBER_ID, PORTAL);

        expect(repository.create).toHaveBeenCalledTimes(1);
        expect(repository.update).not.toHaveBeenCalled();
        const payload = JSON.parse(fakeEncryption.decrypt(qr.encryptedCode)) as {
            qrCodeId: string;
        };
        expect(payload.qrCodeId).toBe(qr.id);
    });

    it("перевыпуск меняет строку кода у той же записи", async () => {
        const { service } = build();
        const first = await service.generateOrRegenerate(MEMBER_ID, PORTAL);
        const second = await service.generateOrRegenerate(MEMBER_ID, PORTAL);

        expect(second.id).toBe(first.id);
        expect(second.encryptedCode).not.toBe(first.encryptedCode);
    });

    it("две одновременные первые выдачи не падают: проигравший перевыпускает созданную запись", async () => {
        const { service, raceOnNextCreate, repository } = build();
        raceOnNextCreate();

        const qr = await service.generateOrRegenerate(MEMBER_ID, PORTAL);

        expect(qr.id).toBe("winner");
        expect(repository.update).toHaveBeenCalledTimes(1);
    });

    it("не выдаётся неактивному участнику и тому, кто не подтвердил членство", async () => {
        const inactive = build({ isActive: false });
        await expect(inactive.service.generateOrRegenerate(MEMBER_ID, PORTAL)).rejects.toThrow(
            BadRequestException
        );

        const unconfirmed = build({ consentStatus: MemberConsentStatus.pending });
        await expect(unconfirmed.service.generateOrRegenerate(MEMBER_ID, PORTAL)).rejects.toThrow(
            BadRequestException
        );
    });

    describe("ensureCurrent", () => {
        it("выдаёт код, если его ещё нет", async () => {
            const { service, repository } = build();
            const qr = await service.ensureCurrent(MEMBER_ID, PORTAL);
            expect(qr.encryptedCode).toBeTruthy();
            expect(repository.create).toHaveBeenCalledTimes(1);
        });

        it("возвращает действующий код как есть", async () => {
            const { service, repository } = build();
            const first = await service.ensureCurrent(MEMBER_ID, PORTAL);
            const again = await service.ensureCurrent(MEMBER_ID, PORTAL);
            expect(again.encryptedCode).toBe(first.encryptedCode);
            expect(repository.update).not.toHaveBeenCalled();
        });

        it("продлевает просроченный код новой строкой", async () => {
            const { service, rows } = build();
            const first = await service.ensureCurrent(MEMBER_ID, PORTAL);
            rows.set(first.id, {
                id: first.id,
                encryptedCode: first.encryptedCode,
                expiresAt: new Date(Date.now() - 1000),
            });

            const renewed = await service.ensureCurrent(MEMBER_ID, PORTAL);
            expect(renewed.encryptedCode).not.toBe(first.encryptedCode);
            expect(renewed.isExpired()).toBe(false);
        });
    });
});

describe("QrCodesService — проверка при сканировании", () => {
    it("действующий код пропускается и называет участника", async () => {
        const { service } = build();
        const qr = await service.generateOrRegenerate(MEMBER_ID, PORTAL);

        const result = await service.validateScannedCode(qr.encryptedCode, PORTAL);

        expect(result).toMatchObject({ valid: true, memberId: MEMBER_ID, qrCodeId: qr.id });
    });

    it("прежний код после перевыпуска гаснет, новый работает", async () => {
        const { service } = build();
        const oldCode = (await service.generateOrRegenerate(MEMBER_ID, PORTAL)).encryptedCode;
        const newCode = (await service.generateOrRegenerate(MEMBER_ID, PORTAL)).encryptedCode;

        const stale = await service.validateScannedCode(oldCode, PORTAL);
        expect(stale).toMatchObject({ valid: false, errorCode: "revoked" });
        expect((await service.validateScannedCode(newCode, PORTAL)).valid).toBe(true);
    });

    it("отозванный код (строка удалена) не принимается", async () => {
        const { service, rows } = build();
        const qr = await service.generateOrRegenerate(MEMBER_ID, PORTAL);
        rows.clear();

        expect(await service.validateScannedCode(qr.encryptedCode, PORTAL)).toMatchObject({
            valid: false,
            errorCode: "revoked",
        });
    });

    it("код, подделанный ключом сервера, но которого нет в БД, не проходит", async () => {
        const { service } = build();
        const forged = fakeEncryption.encrypt(
            JSON.stringify({
                memberId: MEMBER_ID,
                qrCodeId: "never-issued",
                issuedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
            })
        );

        expect(await service.validateScannedCode(forged, PORTAL)).toMatchObject({
            valid: false,
            errorCode: "revoked",
        });
    });

    it("мусор не расшифровывается, а payload без полей отклоняется", async () => {
        const { service } = build();
        expect(await service.validateScannedCode("not-a-code", PORTAL)).toMatchObject({
            errorCode: "undecryptable",
        });
        expect(
            await service.validateScannedCode(fakeEncryption.encrypt("{}"), PORTAL)
        ).toMatchObject({ errorCode: "malformed" });
    });

    it("просроченный по payload код отклоняется", async () => {
        const { service } = build();
        const expired = fakeEncryption.encrypt(
            JSON.stringify({
                memberId: MEMBER_ID,
                qrCodeId: "x",
                issuedAt: new Date(Date.now() - 2000).toISOString(),
                expiresAt: new Date(Date.now() - 1000).toISOString(),
            })
        );
        expect(await service.validateScannedCode(expired, PORTAL)).toMatchObject({
            errorCode: "expired",
        });
    });

    it("код другого клуба не работает на стойке этого клуба", async () => {
        const { service } = build();
        const qr = await service.generateOrRegenerate(MEMBER_ID, PORTAL);

        expect(await service.validateScannedCode(qr.encryptedCode, OTHER_PORTAL)).toMatchObject({
            valid: false,
            errorCode: "wrong_club",
        });
    });

    it("отключённого участника не пускает, но называет его для сотрудника", async () => {
        const { service, state } = build();
        const qr = await service.generateOrRegenerate(MEMBER_ID, PORTAL);
        state.isActive = false;

        const result = await service.validateScannedCode(qr.encryptedCode, PORTAL);
        expect(result).toMatchObject({ valid: false, errorCode: "member_inactive" });
        expect(result.member?.id).toBe(MEMBER_ID);
    });

    it("участник без подтверждённого членства не отмечается", async () => {
        const { service, state } = build();
        const qr = await service.generateOrRegenerate(MEMBER_ID, PORTAL);
        state.consentStatus = MemberConsentStatus.pending;

        expect(await service.validateScannedCode(qr.encryptedCode, PORTAL)).toMatchObject({
            valid: false,
            errorCode: "membership_unconfirmed",
        });
    });

    it("каждый отказ несёт и код, и английский текст", async () => {
        const { service } = build();
        const result = await service.validateScannedCode("not-a-code", PORTAL);
        expect(result.errorCode).toBe("undecryptable");
        expect(result.error).toBe("QR code cannot be decrypted");
    });
});
