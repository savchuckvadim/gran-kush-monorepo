import { BadRequestException } from "@nestjs/common";

import { MemberConsentStatus, Prisma } from "@prisma/client";
import { createHmac, randomUUID } from "crypto";

import { QrCodesService } from "../application/services/qr-codes.service";
import { QrCode } from "../domain/entity/qr-code.entity";
import { formatQrToken, parseQrToken, QR_TOKEN_LENGTH } from "../domain/qr-token";

const PORTAL = "portal-a";
const OTHER_PORTAL = "portal-b";
const MEMBER_ID = "member-1";

type MemberState = {
    portalId: string;
    isActive: boolean;
    consentStatus: MemberConsentStatus;
};

/** Подпись с постоянным тестовым ключом: важно лишь, что она зависит от цели и данных. */
const signer = {
    sign: (purpose: string, data: string) =>
        createHmac("sha256", "test-key").update(`${purpose}|${data}`).digest(),
};

const build = (initial: Partial<MemberState> = {}) => {
    const state: MemberState = {
        portalId: PORTAL,
        isActive: true,
        consentStatus: MemberConsentStatus.confirmed,
        ...initial,
    };
    type Row = { id: string; issuedAt: Date; expiresAt: Date };
    const rows = new Map<string, Row>();
    let failNextCreateWithRace = false;

    const toEntity = (row: Row): QrCode =>
        new QrCode({
            id: row.id,
            memberId: MEMBER_ID,
            issuedAt: row.issuedAt,
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
        create: jest.fn(async (data: { issuedAt: Date; expiresAt: Date }) => {
            if (failNextCreateWithRace) {
                failNextCreateWithRace = false;
                // Параллельный запрос успел вставить строку раньше
                const winner = randomUUID();
                rows.set(winner, {
                    id: winner,
                    issuedAt: new Date(Date.now() - 1000),
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
                });
                throw new Prisma.PrismaClientKnownRequestError("duplicate", {
                    code: "P2002",
                    clientVersion: "test",
                    meta: { target: ["entity_record_id"] },
                });
            }
            const row = { id: randomUUID(), ...data };
            rows.set(row.id, row);
            return toEntity(row);
        }),
        update: jest.fn(async (id: string, data: { issuedAt: Date; expiresAt: Date }) => {
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
        signer as never,
        members as never,
        config as never
    );

    const issue = async () => {
        const qr = await service.generateOrRegenerate(MEMBER_ID, PORTAL);
        return { qr, code: service.codeOf(qr) };
    };

    return {
        service,
        repository,
        rows,
        state,
        issue,
        raceOnNextCreate: () => {
            failNextCreateWithRace = true;
        },
    };
};

describe("qr-token — строка в QR", () => {
    it("38 знаков base64url, id читается обратно", () => {
        const id = randomUUID();
        const token = formatQrToken(id, Buffer.alloc(32, 7));

        expect(token).toHaveLength(QR_TOKEN_LENGTH);
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(parseQrToken(token)?.qrCodeId).toBe(id);
    });

    it("мусор, обрывок и прежний длинный шифртекст — не код", () => {
        const token = formatQrToken(randomUUID(), Buffer.alloc(12, 1));
        expect(parseQrToken("not-a-code")).toBeNull();
        expect(parseQrToken(token.slice(0, 37))).toBeNull();
        expect(parseQrToken(`${token}x`)).toBeNull();
        expect(parseQrToken("a1b2c3:d4e5f6:" + "0".repeat(400))).toBeNull();
    });
});

describe("QrCodesService — выдача", () => {
    it("первая выдача пишет одну строку, код — короткий и подписанный", async () => {
        const { repository, issue } = build();
        const { qr, code } = await issue();

        expect(repository.create).toHaveBeenCalledTimes(1);
        expect(repository.update).not.toHaveBeenCalled();
        expect(code).toHaveLength(QR_TOKEN_LENGTH);
        expect(parseQrToken(code)?.qrCodeId).toBe(qr.id);
    });

    it("перевыпуск у той же записи даёт другой код — даже в ту же миллисекунду", async () => {
        const { issue } = build();
        const first = await issue();
        const second = await issue();

        expect(second.qr.id).toBe(first.qr.id);
        expect(second.code).not.toBe(first.code);
    });

    it("две одновременные первые выдачи не падают: проигравший перевыпускает созданную запись", async () => {
        const { service, raceOnNextCreate, repository } = build();
        raceOnNextCreate();

        const qr = await service.generateOrRegenerate(MEMBER_ID, PORTAL);

        expect(repository.update).toHaveBeenCalledWith(qr.id, expect.any(Object));
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
            await service.ensureCurrent(MEMBER_ID, PORTAL);
            expect(repository.create).toHaveBeenCalledTimes(1);
        });

        it("возвращает действующий код как есть: код тот же при каждом открытии", async () => {
            const { service, repository } = build();
            const first = await service.ensureCurrent(MEMBER_ID, PORTAL);
            const again = await service.ensureCurrent(MEMBER_ID, PORTAL);
            expect(service.codeOf(again)).toBe(service.codeOf(first));
            expect(repository.update).not.toHaveBeenCalled();
        });

        it("продлевает просроченный код новым", async () => {
            const { service, rows } = build();
            const first = await service.ensureCurrent(MEMBER_ID, PORTAL);
            rows.set(first.id, {
                id: first.id,
                issuedAt: first.issuedAt,
                expiresAt: new Date(Date.now() - 1000),
            });

            const renewed = await service.ensureCurrent(MEMBER_ID, PORTAL);
            expect(service.codeOf(renewed)).not.toBe(service.codeOf(first));
            expect(renewed.isExpired()).toBe(false);
        });
    });
});

describe("QrCodesService — проверка при сканировании", () => {
    it("действующий код пропускается и называет участника", async () => {
        const { service, issue } = build();
        const { qr, code } = await issue();

        const result = await service.validateScannedCode(code, PORTAL);

        expect(result).toMatchObject({ valid: true, memberId: MEMBER_ID, qrCodeId: qr.id });
    });

    it("пробелы по краям (сканер, ручной ввод) не мешают", async () => {
        const { service, issue } = build();
        const { code } = await issue();

        expect((await service.validateScannedCode(`  ${code}\n`, PORTAL)).valid).toBe(true);
    });

    it("прежний код после перевыпуска гаснет, новый работает", async () => {
        const { service, issue } = build();
        const old = (await issue()).code;
        const fresh = (await issue()).code;

        expect(await service.validateScannedCode(old, PORTAL)).toMatchObject({
            valid: false,
            errorCode: "revoked",
        });
        expect((await service.validateScannedCode(fresh, PORTAL)).valid).toBe(true);
    });

    it("отозванный код (запись удалена) не принимается", async () => {
        const { service, rows, issue } = build();
        const { code } = await issue();
        rows.clear();

        expect(await service.validateScannedCode(code, PORTAL)).toMatchObject({
            valid: false,
            errorCode: "revoked",
        });
    });

    it("код с id настоящей записи, но чужой подписью не проходит и ничего не говорит о клубе", async () => {
        const { service, issue } = build();
        const { qr } = await issue();
        const forged = formatQrToken(qr.id, Buffer.alloc(12, 0));

        const result = await service.validateScannedCode(forged, OTHER_PORTAL);
        expect(result).toMatchObject({ valid: false, errorCode: "revoked" });
    });

    it("строка, которая не может быть кодом, отклоняется без обращения к БД", async () => {
        const { service, repository } = build();

        expect(await service.validateScannedCode("not-a-code", PORTAL)).toMatchObject({
            valid: false,
            errorCode: "malformed",
            error: "Not a club entry code",
        });
        expect(repository.findById).not.toHaveBeenCalled();
    });

    it("просроченный код отклоняется", async () => {
        const { service, rows, issue } = build();
        const { qr, code } = await issue();
        rows.set(qr.id, { id: qr.id, issuedAt: qr.issuedAt, expiresAt: new Date(Date.now() - 1) });

        expect(await service.validateScannedCode(code, PORTAL)).toMatchObject({
            errorCode: "expired",
        });
    });

    it("код другого клуба не работает на стойке этого клуба", async () => {
        const { service, issue } = build();
        const { code } = await issue();

        expect(await service.validateScannedCode(code, OTHER_PORTAL)).toMatchObject({
            valid: false,
            errorCode: "wrong_club",
        });
    });

    it("отключённого участника не пускает, но называет его для сотрудника", async () => {
        const { service, state, issue } = build();
        const { code } = await issue();
        state.isActive = false;

        const result = await service.validateScannedCode(code, PORTAL);
        expect(result).toMatchObject({ valid: false, errorCode: "member_inactive" });
        expect(result.member?.id).toBe(MEMBER_ID);
    });

    it("участник без подтверждённого членства не отмечается", async () => {
        const { service, state, issue } = build();
        const { code } = await issue();
        state.consentStatus = MemberConsentStatus.pending;

        expect(await service.validateScannedCode(code, PORTAL)).toMatchObject({
            valid: false,
            errorCode: "membership_unconfirmed",
        });
    });
});
