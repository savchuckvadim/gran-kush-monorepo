import { BadRequestException, ConflictException, Injectable, Logger } from "@nestjs/common";

import {
    DocumentAccessAction,
    DocumentAccessActor,
    UserDocument,
    UserDocumentSide,
    UserSignature,
} from "@prisma/client";
import { StorageService } from "@storage/application/services/storage.service";
import { StorageType } from "@storage/domain/enums/storage-type.enum";

import { UPLOAD_LIMITS, UploadKind, ValidatedUpload, validateUpload } from "@common/upload";
import { DocumentAccessLogService } from "@modules/account/application/services/document-access-log.service";
import { MemberDocumentShareRepository } from "@modules/account/domain/repositories/member-document-share-repository.interface";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";

/**
 * Кому показать загруженный файл. По умолчанию — никому: загрузка в аккаунт сама по себе клубам
 * ничего не открывает (TASK-704). Клуб, который загрузил файл в карточке участника, показывает
 * его только себе.
 */
export type FileShareTarget = { memberId: string } | "none";

/** Кто загружает: для журнала и для правил (клуб не перезаписывает то, что видят другие). */
export interface FileActor {
    type: DocumentAccessActor;
    /** Сотрудник клуба (Employee.id) или владелец аккаунта (User.id) */
    id?: string;
    /** Клуб сотрудника; у владельца его нет */
    portalId?: string;
}

/**
 * Единственный путь файла в аккаунт: проверка содержимого, приватный бакет, строка в БД,
 * чистка прежнего объекта. Документы и подпись аккаунт-уровневые и переиспользуются между
 * клубами, поэтому папка в хранилище — `accounts/<userId>`, а не портал.
 *
 * Правило замены, которое держит всё остальное: клуб видит ровно тот файл, который ему показали.
 * Поэтому документ слота (type, side), уже показанный кому-то ещё, НЕ перезаписывается — рядом
 * появляется новая версия; прежняя живёт, пока на неё есть показ, и удаляется вместе с последним
 * (см. `pruneSuperseded`). Если же слот не показан никому, кроме того, кто загружает, файл
 * подменяется на месте — версий без нужды не плодим.
 */
@Injectable()
export class AccountFilesService {
    private readonly logger = new Logger(AccountFilesService.name);

    constructor(
        private readonly storageService: StorageService,
        private readonly userDocumentRepository: UserDocumentRepository,
        private readonly userSignatureRepository: UserSignatureRepository,
        private readonly shares: MemberDocumentShareRepository,
        private readonly accessLog: DocumentAccessLogService
    ) {}

    async replaceDocument(input: {
        userId: string;
        type: string;
        side: UserDocumentSide;
        file: Buffer;
        number?: string | null;
        share?: FileShareTarget;
        actor?: FileActor;
    }): Promise<UserDocument> {
        const upload = validateUpload(input.file, "document");
        const share = input.share ?? "none";
        const actor = input.actor ?? { type: DocumentAccessActor.owner, id: input.userId };
        const targetMemberId = share === "none" ? undefined : share.memberId;

        const current = await this.userDocumentRepository.findByUserTypeSide(
            input.userId,
            input.type,
            input.side
        );
        if (!current) {
            const count = await this.userDocumentRepository.countByUser(input.userId);
            if (count >= UPLOAD_LIMITS.documentsPerAccount) {
                throw new BadRequestException(
                    `Account cannot hold more than ${UPLOAD_LIMITS.documentsPerAccount} documents`
                );
            }
        }

        const storagePath = await this.store(upload, input.userId, "document");

        // Видит ли текущую версию кто-то, кроме того, кто сейчас загружает
        const seenByOthers = current
            ? (await this.shares.countDocumentSharesExcept(current.id, targetMemberId)) > 0
            : false;

        let document: UserDocument;
        if (current && !seenByOthers) {
            document = await this.persist(storagePath, () =>
                this.userDocumentRepository.updateFile(current.id, {
                    storagePath,
                    number: input.number,
                })
            );
            await this.discard(current.storagePath, storagePath);
        } else {
            document = await this.persist(storagePath, () =>
                this.userDocumentRepository.create({
                    userId: input.userId,
                    type: input.type,
                    side: input.side,
                    version: (current?.version ?? 0) + 1,
                    storagePath,
                    // Новая версия того же документа: номер не меняли — он остаётся прежним
                    number: input.number !== undefined ? input.number : (current?.number ?? null),
                })
            );
        }

        await this.accessLog.record({
            userId: input.userId,
            subject: "document",
            documentId: document.id,
            memberId: targetMemberId,
            portalId: actor.portalId,
            actorType: actor.type,
            actorId: actor.id,
            action: current ? DocumentAccessAction.replace : DocumentAccessAction.upload,
        });

        if (share !== "none") {
            await this.shares.shareDocuments(share.memberId, [document.id]);
            await this.accessLog.record({
                userId: input.userId,
                subject: "document",
                documentId: document.id,
                memberId: share.memberId,
                portalId: actor.portalId,
                actorType: actor.type,
                actorId: actor.id,
                action: DocumentAccessAction.share,
            });
        }

        await this.pruneSuperseded(input.userId);
        return document;
    }

    /**
     * Подпись у аккаунта одна, и её видят все клубы, которым она показана. Поэтому клуб не может
     * подменить подпись, если её видит кто-то ещё: владелец обновляет её сам.
     */
    async replaceSignature(input: {
        userId: string;
        file: Buffer;
        share?: FileShareTarget;
        actor?: FileActor;
    }): Promise<UserSignature> {
        const upload = validateUpload(input.file, "signature");
        const share = input.share ?? "none";
        const actor = input.actor ?? { type: DocumentAccessActor.owner, id: input.userId };
        const targetMemberId = share === "none" ? undefined : share.memberId;

        const existing = await this.userSignatureRepository.findByUser(input.userId);
        if (existing && actor.type === DocumentAccessActor.club) {
            const seenByOthers =
                (await this.shares.countSignatureSharesExcept(input.userId, targetMemberId)) > 0;
            if (seenByOthers) {
                throw new ConflictException(
                    "The account signature is shown to other clubs. The member has to update it themselves"
                );
            }
        }

        const storagePath = await this.store(upload, input.userId, "signature");
        const signature = await this.persist(storagePath, () =>
            this.userSignatureRepository.upsertByUser({ userId: input.userId, storagePath })
        );
        await this.discard(existing?.storagePath, storagePath);

        await this.accessLog.record({
            userId: input.userId,
            subject: "signature",
            memberId: targetMemberId,
            portalId: actor.portalId,
            actorType: actor.type,
            actorId: actor.id,
            action: existing ? DocumentAccessAction.replace : DocumentAccessAction.upload,
        });

        if (share !== "none") {
            await this.shares.setSignatureShared(share.memberId, true);
            await this.accessLog.record({
                userId: input.userId,
                subject: "signature",
                memberId: share.memberId,
                portalId: actor.portalId,
                actorType: actor.type,
                actorId: actor.id,
                action: DocumentAccessAction.share,
            });
        }
        return signature;
    }

    /** Владелец удаляет слот целиком: все версии и показы пропадают вместе с файлами. */
    async removeDocument(document: UserDocument, actor?: FileActor): Promise<void> {
        const versions = await this.userDocumentRepository.findVersions(
            document.userId,
            document.type,
            document.side
        );
        for (const version of versions) {
            await this.userDocumentRepository.deleteById(version.id);
            await this.discard(version.storagePath);
        }
        await this.accessLog.record({
            userId: document.userId,
            subject: "document",
            documentId: document.id,
            actorType: actor?.type ?? DocumentAccessActor.owner,
            actorId: actor?.id ?? document.userId,
            action: DocumentAccessAction.delete,
        });
    }

    async removeSignature(userId: string, actor?: FileActor): Promise<void> {
        const existing = await this.userSignatureRepository.findByUser(userId);
        if (!existing) {
            return;
        }
        await this.shares.clearSignatureShares(userId);
        await this.userSignatureRepository.deleteByUser(userId);
        await this.discard(existing.storagePath);
        await this.accessLog.record({
            userId,
            subject: "signature",
            actorType: actor?.type ?? DocumentAccessActor.owner,
            actorId: actor?.id ?? userId,
            action: DocumentAccessAction.delete,
        });
    }

    /**
     * Удалить прежние версии, которые никому не показаны: файл, который больше не нужен ни
     * владельцу (он уже загрузил новый), ни клубу, не должен лежать в бакете. Зовётся после
     * замены и после любого отзыва показа.
     */
    async pruneSuperseded(userId: string): Promise<void> {
        const stale = await this.userDocumentRepository.findSupersededWithoutShares(userId);
        for (const document of stale) {
            await this.userDocumentRepository.deleteById(document.id);
            await this.discard(document.storagePath);
        }
    }

    private async store(
        upload: ValidatedUpload,
        userId: string,
        kind: UploadKind
    ): Promise<string> {
        // Имя в хранилище — uuid плюс расширение по сигнатуре; от клиента сюда ничего не доходит
        const result = await this.storageService.uploadFile(
            {
                buffer: upload.buffer,
                originalname: `${kind}.${upload.extension}`,
                mimetype: upload.mime,
            },
            `accounts/${userId}`,
            StorageType.PRIVATE
        );
        return result.relativePath;
    }

    /** Строка не записалась — только что загруженный объект не должен остаться сиротой. */
    private async persist<T>(storagePath: string, write: () => Promise<T>): Promise<T> {
        try {
            return await write();
        } catch (error) {
            await this.discard(storagePath);
            throw error;
        }
    }

    /**
     * Прежний объект удаляется после записи новой строки, иначе в бакете копились бы все
     * версии удостоверения. Сбой удаления не отменяет загрузку — только логируется.
     */
    private async discard(storagePath: string | undefined, keep?: string): Promise<void> {
        if (!storagePath || storagePath === keep) return;
        try {
            await this.storageService.deleteFile(storagePath);
        } catch (error) {
            this.logger.warn(`Failed to delete ${storagePath}: ${String(error)}`);
        }
    }
}
