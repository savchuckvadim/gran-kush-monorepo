import { BadRequestException, ConflictException } from "@nestjs/common";

import { DocumentAccessActor, UserDocument, UserDocumentSide, UserSignature } from "@prisma/client";
import { StorageService } from "@storage/application/services/storage.service";

import { UPLOAD_LIMITS } from "@common/upload";

import { AccountFilesService } from "../application/services/account-files.service";
import { DocumentAccessLogService } from "../application/services/document-access-log.service";
import { MemberDocumentShareRepository } from "../domain/repositories/member-document-share-repository.interface";
import { UserDocumentRepository } from "../domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "../domain/repositories/user-signature-repository.interface";

const PNG = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(16),
]);
const HTML = Buffer.from("<html></html>");

const NEW_PATH = "private/accounts/u1/new.png";
const OLD_PATH = "private/accounts/u1/old.png";

const document = (overrides: Partial<UserDocument> = {}): UserDocument =>
    ({
        id: "doc-1",
        userId: "u1",
        type: "passport",
        side: UserDocumentSide.front,
        version: 1,
        number: "X123",
        storagePath: OLD_PATH,
        ...overrides,
    }) as UserDocument;

const createMocks = () => ({
    storage: {
        uploadFile: jest.fn().mockResolvedValue({ relativePath: NEW_PATH }),
        deleteFile: jest.fn().mockResolvedValue(undefined),
    },
    documents: {
        findAllByUser: jest.fn(),
        countByUser: jest.fn().mockResolvedValue(0),
        findById: jest.fn(),
        findByUserTypeSide: jest.fn().mockResolvedValue(null),
        findVersions: jest.fn().mockResolvedValue([]),
        create: jest
            .fn()
            .mockImplementation((data: Partial<UserDocument>) =>
                Promise.resolve(document({ id: "doc-new", ...data }))
            ),
        updateFile: jest.fn().mockResolvedValue(document({ storagePath: NEW_PATH })),
        findSupersededWithoutShares: jest.fn().mockResolvedValue([]),
        deleteById: jest.fn().mockResolvedValue(undefined),
    },
    signatures: {
        findByUser: jest.fn().mockResolvedValue(null),
        upsertByUser: jest.fn().mockResolvedValue({ storagePath: NEW_PATH } as UserSignature),
        deleteByUser: jest.fn().mockResolvedValue(undefined),
    },
    shares: {
        shareDocuments: jest.fn().mockResolvedValue(undefined),
        setSignatureShared: jest.fn().mockResolvedValue(undefined),
        clearSignatureShares: jest.fn().mockResolvedValue(undefined),
        countDocumentSharesExcept: jest.fn().mockResolvedValue(0),
        countSignatureSharesExcept: jest.fn().mockResolvedValue(0),
    },
    accessLog: { record: jest.fn().mockResolvedValue(undefined) },
});

describe("AccountFilesService", () => {
    let storage: ReturnType<typeof createMocks>["storage"];
    let documents: ReturnType<typeof createMocks>["documents"];
    let signatures: ReturnType<typeof createMocks>["signatures"];
    let shares: ReturnType<typeof createMocks>["shares"];
    let accessLog: ReturnType<typeof createMocks>["accessLog"];
    let service: AccountFilesService;

    beforeEach(() => {
        ({ storage, documents, signatures, shares, accessLog } = createMocks());
        service = new AccountFilesService(
            storage as unknown as StorageService,
            documents as unknown as UserDocumentRepository,
            signatures as unknown as UserSignatureRepository,
            shares as unknown as MemberDocumentShareRepository,
            accessLog as unknown as DocumentAccessLogService
        );
    });

    const replaceFront = (file: Buffer = PNG, extra: Record<string, unknown> = {}) =>
        service.replaceDocument({
            userId: "u1",
            type: "passport",
            side: UserDocumentSide.front,
            file,
            ...extra,
        });

    it("проверяет содержимое до обращения к хранилищу", async () => {
        await expect(replaceFront(HTML)).rejects.toThrow(BadRequestException);
        expect(storage.uploadFile).not.toHaveBeenCalled();
        expect(documents.create).not.toHaveBeenCalled();
    });

    it("имя объекта — по сигнатуре, в приватную папку аккаунта", async () => {
        await replaceFront();
        expect(storage.uploadFile).toHaveBeenCalledWith(
            expect.objectContaining({ originalname: "document.png", mimetype: "image/png" }),
            "accounts/u1",
            "private"
        );
    });

    it("первая загрузка создаёт версию 1 и ничего не удаляет", async () => {
        await replaceFront();

        expect(documents.create).toHaveBeenCalledWith(expect.objectContaining({ version: 1 }));
        expect(storage.deleteFile).not.toHaveBeenCalled();
    });

    it("слот никому не показан — файл подменяется на месте, прежний объект удаляется", async () => {
        documents.findByUserTypeSide.mockResolvedValue(document());

        await replaceFront();

        expect(documents.updateFile).toHaveBeenCalledWith(
            "doc-1",
            expect.objectContaining({ storagePath: NEW_PATH })
        );
        expect(documents.create).not.toHaveBeenCalled();
        expect(storage.deleteFile).toHaveBeenCalledWith(OLD_PATH);
        expect(storage.deleteFile).not.toHaveBeenCalledWith(NEW_PATH);
    });

    describe("клуб видит ровно тот файл, который ему показали (TASK-704)", () => {
        it("слот показан другому клубу — загрузка клуба B не подменяет файл клуба A", async () => {
            documents.findByUserTypeSide.mockResolvedValue(document({ version: 1 }));
            shares.countDocumentSharesExcept.mockResolvedValue(1);

            const created = await replaceFront(PNG, {
                share: { memberId: "member-b" },
                actor: { type: DocumentAccessActor.club, id: "emp-b", portalId: "portal-b" },
            });

            expect(documents.updateFile).not.toHaveBeenCalled();
            expect(documents.create).toHaveBeenCalledWith(
                expect.objectContaining({ version: 2, number: "X123" })
            );
            expect(storage.deleteFile).not.toHaveBeenCalledWith(OLD_PATH);
            expect(shares.shareDocuments).toHaveBeenCalledWith("member-b", [created.id]);
            expect(shares.countDocumentSharesExcept).toHaveBeenCalledWith("doc-1", "member-b");
        });

        it("слот показан только тому же клубу — подменяется на месте", async () => {
            documents.findByUserTypeSide.mockResolvedValue(document());
            shares.countDocumentSharesExcept.mockResolvedValue(0);

            await replaceFront(PNG, { share: { memberId: "member-b" } });

            expect(documents.updateFile).toHaveBeenCalled();
            expect(documents.create).not.toHaveBeenCalled();
        });

        it("владелец заменяет показанный клубу документ — клуб остаётся на прежнем файле", async () => {
            documents.findByUserTypeSide.mockResolvedValue(document());
            shares.countDocumentSharesExcept.mockResolvedValue(1);

            await replaceFront();

            expect(documents.create).toHaveBeenCalledWith(expect.objectContaining({ version: 2 }));
            expect(storage.deleteFile).not.toHaveBeenCalledWith(OLD_PATH);
            expect(shares.shareDocuments).not.toHaveBeenCalled();
        });

        it("новый номер переписывает прежний, не указан — переносится", async () => {
            documents.findByUserTypeSide.mockResolvedValue(document());
            shares.countDocumentSharesExcept.mockResolvedValue(1);

            await replaceFront(PNG, { number: "Y999" });

            expect(documents.create).toHaveBeenCalledWith(
                expect.objectContaining({ number: "Y999" })
            );
        });
    });

    it("строка не записалась — новый объект не остаётся сиротой, старый цел", async () => {
        documents.findByUserTypeSide.mockResolvedValue(document());
        documents.updateFile.mockRejectedValue(new Error("db down"));

        await expect(replaceFront()).rejects.toThrow("db down");

        expect(storage.deleteFile).toHaveBeenCalledWith(NEW_PATH);
        expect(storage.deleteFile).not.toHaveBeenCalledWith(OLD_PATH);
    });

    it("сбой удаления прежнего объекта не отменяет загрузку", async () => {
        documents.findByUserTypeSide.mockResolvedValue(document());
        storage.deleteFile.mockRejectedValue(new Error("s3 down"));

        await expect(replaceFront()).resolves.toBeDefined();
    });

    it("новая пара (тип, сторона) сверх лимита аккаунта отклоняется, замена — нет", async () => {
        documents.countByUser.mockResolvedValue(UPLOAD_LIMITS.documentsPerAccount);

        await expect(replaceFront()).rejects.toThrow(/cannot hold more/);
        expect(storage.uploadFile).not.toHaveBeenCalled();

        documents.findByUserTypeSide.mockResolvedValue(document());
        await expect(replaceFront()).resolves.toBeDefined();
    });

    describe("кому показан файл", () => {
        it("загрузка владельца в аккаунт не показывает файл никому", async () => {
            await replaceFront();
            await service.replaceSignature({ userId: "u1", file: PNG });

            expect(shares.shareDocuments).not.toHaveBeenCalled();
            expect(shares.setSignatureShared).not.toHaveBeenCalled();
        });

        it("клуб грузит в карточке — файл виден только этому членству", async () => {
            const share = { memberId: "m1" };
            const actor = { type: DocumentAccessActor.club, id: "emp", portalId: "p1" };
            const doc = await replaceFront(PNG, { share, actor });
            await service.replaceSignature({ userId: "u1", file: PNG, share, actor });

            expect(shares.shareDocuments).toHaveBeenCalledWith("m1", [doc.id]);
            expect(shares.setSignatureShared).toHaveBeenCalledWith("m1", true);
        });

        it("файл не сохранился — никому не показывается", async () => {
            documents.create.mockRejectedValue(new Error("db down"));

            await expect(replaceFront(PNG, { share: { memberId: "m1" } })).rejects.toThrow(
                "db down"
            );

            expect(shares.shareDocuments).not.toHaveBeenCalled();
        });
    });

    describe("подпись", () => {
        it("прежний объект удаляется при замене", async () => {
            signatures.findByUser.mockResolvedValue({ storagePath: OLD_PATH } as UserSignature);

            await service.replaceSignature({ userId: "u1", file: PNG });

            expect(storage.uploadFile).toHaveBeenCalledWith(
                expect.objectContaining({ originalname: "signature.png" }),
                "accounts/u1",
                "private"
            );
            expect(storage.deleteFile).toHaveBeenCalledWith(OLD_PATH);
        });

        it("клуб не подменяет подпись, которую видит другой клуб", async () => {
            signatures.findByUser.mockResolvedValue({ storagePath: OLD_PATH } as UserSignature);
            shares.countSignatureSharesExcept.mockResolvedValue(1);

            await expect(
                service.replaceSignature({
                    userId: "u1",
                    file: PNG,
                    share: { memberId: "m2" },
                    actor: { type: DocumentAccessActor.club, id: "emp", portalId: "p2" },
                })
            ).rejects.toThrow(ConflictException);

            expect(storage.uploadFile).not.toHaveBeenCalled();
            expect(signatures.upsertByUser).not.toHaveBeenCalled();
        });

        it("владелец подменяет свою подпись в любом случае", async () => {
            signatures.findByUser.mockResolvedValue({ storagePath: OLD_PATH } as UserSignature);
            shares.countSignatureSharesExcept.mockResolvedValue(2);

            await expect(
                service.replaceSignature({ userId: "u1", file: PNG })
            ).resolves.toBeDefined();
        });

        it("удаление подписи снимает показ всем клубам до удаления строки", async () => {
            signatures.findByUser.mockResolvedValue({ storagePath: OLD_PATH } as UserSignature);

            await service.removeSignature("u1");

            expect(shares.clearSignatureShares).toHaveBeenCalledWith("u1");
            expect(signatures.deleteByUser).toHaveBeenCalledWith("u1");
            expect(storage.deleteFile).toHaveBeenCalledWith(OLD_PATH);
        });
    });

    describe("удаление и чистка версий", () => {
        it("удаление документа убирает все версии слота и их объекты", async () => {
            const v2 = document({ id: "doc-2", version: 2, storagePath: NEW_PATH });
            documents.findVersions.mockResolvedValue([v2, document()]);

            await service.removeDocument(v2);

            expect(documents.deleteById).toHaveBeenCalledWith("doc-2");
            expect(documents.deleteById).toHaveBeenCalledWith("doc-1");
            expect(storage.deleteFile).toHaveBeenCalledWith(NEW_PATH);
            expect(storage.deleteFile).toHaveBeenCalledWith(OLD_PATH);
        });

        it("прежние версии, которые никому не показаны, удаляются вместе с файлом", async () => {
            documents.findSupersededWithoutShares.mockResolvedValue([document()]);

            await service.pruneSuperseded("u1");

            expect(documents.deleteById).toHaveBeenCalledWith("doc-1");
            expect(storage.deleteFile).toHaveBeenCalledWith(OLD_PATH);
        });
    });

    it("загрузка, замена и показ попадают в журнал", async () => {
        documents.findByUserTypeSide.mockResolvedValue(document());

        await replaceFront(PNG, {
            share: { memberId: "m1" },
            actor: { type: DocumentAccessActor.club, id: "emp-1", portalId: "p1" },
        });

        const actions = accessLog.record.mock.calls.map(
            (call: [{ action: string }]) => call[0].action
        );
        expect(actions).toEqual(["replace", "share"]);
        expect(accessLog.record).toHaveBeenCalledWith(
            expect.objectContaining({
                actorType: DocumentAccessActor.club,
                actorId: "emp-1",
                portalId: "p1",
                memberId: "m1",
            })
        );
    });
});
