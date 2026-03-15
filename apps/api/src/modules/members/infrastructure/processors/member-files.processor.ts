import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";

import { Job } from "bullmq";

import { QueueMemberFilesPayload } from "@members/application/services/member-files.service";
import { IdentityDocumentRepository } from "@members/domain/repositories/identity-document-repository.interface";
import { SignatureRepository } from "@members/domain/repositories/signature-repository.interface";
import {
    MEMBER_FILES_QUEUE_NAME,
    MEMBER_FILES_WORKER_EVENTS,
} from "@members/events/member-files-events.constants";
import { StorageService } from "@storage/application/services/storage.service";
import { StorageType } from "@storage/domain/enums/storage-type.enum";

@Processor(MEMBER_FILES_QUEUE_NAME)
@Injectable()
export class MemberFilesProcessor extends WorkerHost {
    private readonly logger = new Logger(MemberFilesProcessor.name);

    constructor(
        private readonly storageService: StorageService,
        private readonly identityDocumentRepository: IdentityDocumentRepository,
        private readonly signatureRepository: SignatureRepository
    ) {
        super();
    }

    async process(job: Job<QueueMemberFilesPayload>): Promise<void> {
        const { memberId, documentType, documentFirst, documentSecond, signature } = job.data;

        if ((documentFirst || documentSecond) && !documentType) {
            throw new Error("documentType is required when identity documents are provided.");
        }

        if (documentType && documentFirst) {
            const storagePath = await this.savePrivateDataUrl(documentFirst, memberId, "identity-first");
            await this.identityDocumentRepository.upsertByMemberTypeAndSide({
                memberId,
                type: documentType,
                side: "first",
                storagePath,
            });
        }

        if (documentType && documentSecond) {
            const storagePath = await this.savePrivateDataUrl(
                documentSecond,
                memberId,
                "identity-second"
            );
            await this.identityDocumentRepository.upsertByMemberTypeAndSide({
                memberId,
                type: documentType,
                side: "second",
                storagePath,
            });
        }

        if (signature) {
            const storagePath = await this.savePrivateDataUrl(signature, memberId, "signature");
            await this.signatureRepository.upsertByMemberId(memberId, { storagePath });
        }
    }

    @OnWorkerEvent(MEMBER_FILES_WORKER_EVENTS.COMPLETED)
    onCompleted(job: Job<QueueMemberFilesPayload>) {
        this.logger.log(`Member files job completed: ${job.id}`);
    }

    @OnWorkerEvent(MEMBER_FILES_WORKER_EVENTS.FAILED)
    onFailed(job: Job<QueueMemberFilesPayload>, error: Error) {
        this.logger.error(`Member files job failed: ${job.id}: ${error.message}`);
    }

    private async savePrivateDataUrl(
        dataUrl: string,
        memberId: string,
        filePrefix: string
    ): Promise<string> {
        const parsed = this.parseDataUrl(dataUrl);
        const folder = `members/${memberId}`;
        const extension = this.getExtensionFromMime(parsed.mimeType);

        const result = await this.storageService.uploadFile(
            {
                buffer: parsed.buffer,
                originalname: `${filePrefix}.${extension}`,
                mimetype: parsed.mimeType,
            },
            folder,
            StorageType.PRIVATE
        );

        return result.relativePath;
    }

    private parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
        const match = /^data:(?<mimeType>[\w.+-]+\/[\w.+-]+);base64,(?<base64>.+)$/u.exec(dataUrl);

        if (!match?.groups?.mimeType || !match.groups.base64) {
            throw new Error("Invalid file format. Expected data URL with base64 payload.");
        }

        return {
            mimeType: match.groups.mimeType,
            buffer: Buffer.from(match.groups.base64, "base64"),
        };
    }

    private getExtensionFromMime(mimeType: string): string {
        const mimeToExtension: Record<string, string> = {
            "image/jpeg": "jpg",
            "image/jpg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "application/pdf": "pdf",
        };

        return mimeToExtension[mimeType] ?? "bin";
    }
}
