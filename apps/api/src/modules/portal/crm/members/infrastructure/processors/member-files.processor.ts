import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";

import { UserDocumentSide } from "@prisma/client";
import { Job } from "bullmq";

import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";
import { QueueMemberFilesPayload } from "@modules/portal/crm/members/application/services/member-files.service";
import {
    MEMBER_FILES_QUEUE_NAME,
    MEMBER_FILES_WORKER_EVENTS,
} from "@modules/portal/crm/members/events/member-files-events.constants";

@Processor(MEMBER_FILES_QUEUE_NAME)
@Injectable()
export class MemberFilesProcessor extends WorkerHost {
    private readonly logger = new Logger(MemberFilesProcessor.name);

    constructor(
        private readonly accountFiles: AccountFilesService,
        private readonly userDocumentRepository: UserDocumentRepository,
        private readonly userSignatureRepository: UserSignatureRepository
    ) {
        super();
    }

    async process(job: Job<QueueMemberFilesPayload>): Promise<void> {
        const { userId, documentType, documentFirst, documentSecond, signature } = job.data;

        if ((documentFirst || documentSecond) && !documentType) {
            throw new Error("documentType is required when identity documents are provided.");
        }

        if (documentType && documentFirst) {
            const storagePath = await this.accountFiles.savePrivateDataUrl(
                documentFirst,
                userId,
                `document-${documentType}-front`
            );
            await this.userDocumentRepository.upsertByUserTypeSide({
                userId,
                type: documentType,
                side: UserDocumentSide.front,
                storagePath,
            });
        }

        if (documentType && documentSecond) {
            const storagePath = await this.accountFiles.savePrivateDataUrl(
                documentSecond,
                userId,
                `document-${documentType}-back`
            );
            await this.userDocumentRepository.upsertByUserTypeSide({
                userId,
                type: documentType,
                side: UserDocumentSide.back,
                storagePath,
            });
        }

        if (signature) {
            const storagePath = await this.accountFiles.savePrivateDataUrl(
                signature,
                userId,
                "signature"
            );
            await this.userSignatureRepository.upsertByUser({ userId, storagePath });
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
}
