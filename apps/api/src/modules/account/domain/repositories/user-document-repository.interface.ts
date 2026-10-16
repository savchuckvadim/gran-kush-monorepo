import { Prisma, UserDocument, UserDocumentSide } from "@prisma/client";

/**
 * Документы аккаунта. «Текущий» документ слота (type, side) — версия с наибольшим номером;
 * прежние версии живут, только пока на них есть показ какому-то клубу (см. модель `UserDocument`).
 * Номер документа репозиторий отдаёт открытым и пишет зашифрованным.
 */
export abstract class UserDocumentRepository {
    /** Текущие версии всех слотов аккаунта. */
    abstract findAllByUser(userId: string): Promise<UserDocument[]>;
    /** Сколько слотов занято (версии одного слота считаются один раз). */
    abstract countByUser(userId: string): Promise<number>;
    /** Любая версия по id: клуб видит именно ту, что ему показали. */
    abstract findById(id: string): Promise<UserDocument | null>;
    /** Версии по списку id (показанные клубу могут быть уже не текущими). */
    abstract findByIds(ids: string[]): Promise<UserDocument[]>;
    /** Текущая версия слота. */
    abstract findByUserTypeSide(
        userId: string,
        type: string,
        side: UserDocumentSide
    ): Promise<UserDocument | null>;
    /** Все версии слота, новые первыми. */
    abstract findVersions(
        userId: string,
        type: string,
        side: UserDocumentSide
    ): Promise<UserDocument[]>;
    abstract create(data: {
        userId: string;
        type: string;
        side: UserDocumentSide;
        version: number;
        storagePath: string;
        number?: string | null;
        meta?: Prisma.InputJsonValue | null;
    }): Promise<UserDocument>;
    /** Подменить файл (и при необходимости номер) в той же версии. */
    abstract updateFile(
        id: string,
        data: { storagePath: string; number?: string | null }
    ): Promise<UserDocument>;
    /** Прежние (не текущие) версии аккаунта, которые больше никому не показаны. */
    abstract findSupersededWithoutShares(userId: string): Promise<UserDocument[]>;
    abstract deleteById(id: string): Promise<void>;
    /** Зашифровать номера, записанные открытым текстом до TASK-704; возвращает число строк. */
    abstract sealLegacyNumbers(): Promise<number>;
}
