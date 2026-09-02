import { BadRequestException } from "@nestjs/common";

import { UserDocument, UserDocumentSide, UserSignature } from "@prisma/client";
import { StorageService } from "@storage/application/services/storage.service";

import { UPLOAD_LIMITS } from "@common/upload";

import { AccountFilesService } from "../application/services/account-files.service";
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
        upsertByUserTypeSide: jest.fn().mockResolvedValue(document({ storagePath: NEW_PATH })),
        deleteById: jest.fn().mockResolvedValue(undefined),
    },
    signatures: {
        findByUser: jest.fn().mockResolvedValue(null),
        upsertByUser: jest.fn().mockResolvedValue({ storagePath: NEW_PATH } as UserSignature),
        deleteByUser: jest.fn(),
    },
});

describe("AccountFilesService", () => {
    let storage: ReturnType<typeof createMocks>["storage"];
    let documents: ReturnType<typeof createMocks>["documents"];
    let signatures: ReturnType<typeof createMocks>["signatures"];
    let service: AccountFilesService;

    beforeEach(() => {
        ({ storage, documents, signatures } = createMocks());
        service = new AccountFilesService(
            storage as unknown as StorageService,
            documents as unknown as UserDocumentRepository,
            signatures as unknown as UserSignatureRepository
        );
    });

    const replaceFront = (file: Buffer = PNG) =>
        service.replaceDocument({
            userId: "u1",
            type: "passport",
            side: UserDocumentSide.front,
            file,
        });

    it("проверяет содержимое до обращения к хранилищу", async () => {
        await expect(replaceFront(HTML)).rejects.toThrow(BadRequestException);
        expect(storage.uploadFile).not.toHaveBeenCalled();
        expect(documents.upsertByUserTypeSide).not.toHaveBeenCalled();
    });

    it("имя объекта — по сигнатуре, в приватную папку аккаунта", async () => {
        await replaceFront();
        expect(storage.uploadFile).toHaveBeenCalledWith(
            expect.objectContaining({ originalname: "document.png", mimetype: "image/png" }),
            "accounts/u1",
            "private"
        );
    });

    it("при замене прежний объект удаляется после записи строки", async () => {
        documents.findByUserTypeSide.mockResolvedValue(document());

        await replaceFront();

        expect(documents.upsertByUserTypeSide).toHaveBeenCalledWith(
            expect.objectContaining({ storagePath: NEW_PATH })
        );
        expect(storage.deleteFile).toHaveBeenCalledWith(OLD_PATH);
        expect(storage.deleteFile).not.toHaveBeenCalledWith(NEW_PATH);
    });

    it("первая загрузка ничего не удаляет", async () => {
        await replaceFront();
        expect(storage.deleteFile).not.toHaveBeenCalled();
    });

    it("строка не записалась — новый объект не остаётся сиротой, старый цел", async () => {
        documents.findByUserTypeSide.mockResolvedValue(document());
        documents.upsertByUserTypeSide.mockRejectedValue(new Error("db down"));

        await expect(replaceFront()).rejects.toThrow("db down");

        expect(storage.deleteFile).toHaveBeenCalledWith(NEW_PATH);
        expect(storage.deleteFile).not.toHaveBeenCalledWith(OLD_PATH);
    });

    it("сбой удаления прежнего объекта не отменяет загрузку", async () => {
        documents.findByUserTypeSide.mockResolvedValue(document());
        storage.deleteFile.mockRejectedValue(new Error("s3 down"));

        await expect(replaceFront()).resolves.toMatchObject({ storagePath: NEW_PATH });
    });

    it("новая пара (тип, сторона) сверх лимита аккаунта отклоняется, замена — нет", async () => {
        documents.countByUser.mockResolvedValue(UPLOAD_LIMITS.documentsPerAccount);

        await expect(replaceFront()).rejects.toThrow(/cannot hold more/);
        expect(storage.uploadFile).not.toHaveBeenCalled();

        documents.findByUserTypeSide.mockResolvedValue(document());
        await expect(replaceFront()).resolves.toBeDefined();
    });

    it("подпись: прежний объект удаляется при замене", async () => {
        signatures.findByUser.mockResolvedValue({ storagePath: OLD_PATH } as UserSignature);

        await service.replaceSignature({ userId: "u1", file: PNG });

        expect(storage.uploadFile).toHaveBeenCalledWith(
            expect.objectContaining({ originalname: "signature.png" }),
            "accounts/u1",
            "private"
        );
        expect(storage.deleteFile).toHaveBeenCalledWith(OLD_PATH);
    });

    it("удаление документа убирает и строку, и объект", async () => {
        await service.removeDocument(document());

        expect(documents.deleteById).toHaveBeenCalledWith("doc-1");
        expect(storage.deleteFile).toHaveBeenCalledWith(OLD_PATH);
    });
});
