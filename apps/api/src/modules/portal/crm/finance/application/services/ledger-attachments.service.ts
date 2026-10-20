import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { detectUploadMime, EXTENSION_BY_MIME, type UploadMime } from "@common/upload";
import { employeeActor } from "@modules/events";

import { LEDGER_ERRORS } from "../../domain/ledger/ledger-entry";
import { FinanceAttachmentStore } from "../../domain/repositories/finance-sources.interface";
import { LedgerRepository } from "../../domain/repositories/ledger-repository.interface";
import { entryUpdatedEvent } from "../events/ledger-events";
import { rethrowClosedPeriod } from "../ledger-errors";
import { assertLive } from "../ledger-guards";

import { LedgerEntriesService, type LedgerEntryView } from "./ledger-entries.service";

/** Имя файла в подписи вложения: без путей, не длиннее колонки отчёта, с расширением по типу. */
const NAME_LIMIT = 120;
/** Путь из Windows: имя файла после последнего обратного слэша. */
const PATH_BACKSLASH = String.fromCharCode(92);

const safeName = (raw: string, mime: UploadMime): string => {
    const base = (raw.split("/").pop()?.split(PATH_BACKSLASH).pop() ?? "")
        .replace(/[^\p{L}\p{N} ._-]/gu, "")
        .trim();
    const extension = EXTENSION_BY_MIME[mime];
    const stem = base.replace(/\.[^.]*$/, "").slice(0, NAME_LIMIT) || "document";
    return `${stem}.${extension}`;
};

export interface LedgerAttachmentFile {
    body: Buffer;
    mime: string;
    name: string;
}

/**
 * Вложение проводки — чек или фактура: JPEG, PNG, WEBP или PDF по содержимому файла. Файл
 * шифруется ключом портала до записи в хранилище; заменить или убрать — только в открытом месяце.
 */
@Injectable()
export class LedgerAttachmentsService {
    constructor(
        private readonly ledger: LedgerRepository,
        private readonly store: FinanceAttachmentStore,
        private readonly entries: LedgerEntriesService
    ) {}

    async attach(
        portalId: string,
        employeeId: string,
        entryId: string,
        file: { buffer: Buffer; originalname: string }
    ): Promise<LedgerEntryView> {
        const entry = await this.entries.findOrFail(portalId, entryId);
        assertLive(entry);
        const mime = detectUploadMime(file.buffer);
        if (!mime) {
            throw new BadRequestException({
                message: "Attach a photo (JPEG, PNG, WEBP) or a PDF",
                code: LEDGER_ERRORS.attachmentType,
            });
        }
        const previous = await this.ledger.attachmentPathOf(portalId, entryId);
        const path = await this.store.put(portalId, entryId, file.buffer);
        const attachment = {
            name: safeName(file.originalname, mime),
            mime,
            size: file.buffer.length,
        };
        try {
            await this.ledger.update(
                portalId,
                entryId,
                { secret: { ...entry.secret, attachment }, attachmentPath: path },
                [entryUpdatedEvent(portalId, entryId, entry.occurredOn, employeeActor(employeeId))]
            );
        } catch (error) {
            await this.store.remove(path);
            rethrowClosedPeriod(error);
        }
        if (previous) await this.store.remove(previous);
        return this.entries.get(portalId, entryId);
    }

    async download(portalId: string, entryId: string): Promise<LedgerAttachmentFile> {
        const entry = await this.entries.findOrFail(portalId, entryId);
        const path = await this.ledger.attachmentPathOf(portalId, entryId);
        const meta = entry.secret.attachment;
        if (!path || !meta)
            throw new NotFoundException({
                message: "No attachment",
                code: LEDGER_ERRORS.attachmentMissing,
            });
        return {
            body: await this.store.get(portalId, entryId, path),
            mime: meta.mime,
            name: meta.name,
        };
    }

    async remove(portalId: string, employeeId: string, entryId: string): Promise<LedgerEntryView> {
        const entry = await this.entries.findOrFail(portalId, entryId);
        assertLive(entry);
        const path = await this.ledger.attachmentPathOf(portalId, entryId);
        if (!path) return this.entries.get(portalId, entryId);
        await this.ledger
            .update(
                portalId,
                entryId,
                { secret: { ...entry.secret, attachment: null }, attachmentPath: null },
                [entryUpdatedEvent(portalId, entryId, entry.occurredOn, employeeActor(employeeId))]
            )
            .catch(rethrowClosedPeriod);
        await this.store.remove(path);
        return this.entries.get(portalId, entryId);
    }
}
