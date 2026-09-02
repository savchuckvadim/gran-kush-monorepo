import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";

import { UserDocumentSide } from "@prisma/client";
import { Job } from "bullmq";

import { decodeDataUrl } from "@common/upload";
import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { QueueMemberFilesPayload } from "@modules/portal/crm/members/application/services/member-files.service";
import {
    MEMBER_FILES_QUEUE_NAME,
    MEMBER_FILES_WORKER_EVENTS,
} from "@modules/portal/crm/members/events/member-files-events.constants";

@Processor(MEMBER_FILES_QUEUE_NAME)
@Injectable()
export class MemberFilesProcessor extends WorkerHost {
    private readonly logger = new Logger(MemberFilesProcessor.name);

    constructor(private readonly accountFiles: AccountFilesService) {
        super();
    }

    async process(job: Job<QueueMemberFilesPayload>): Promise<void> {
        const { userId, documentType, documentFirst, documentSecond, signature } = job.data;

        if ((documentFirst || documentSecond) && !documentType) {
            throw new Error("documentType is required when identity documents are provided.");
        }

        if (documentType && documentFirst) {
            await this.accountFiles.replaceDocument({
                userId,
                type: documentType,
                side: UserDocumentSide.front,
                file: decodeDataUrl(documentFirst),
            });
        }

        if (documentType && documentSecond) {
            await this.accountFiles.replaceDocument({
                userId,
                type: documentType,
                side: UserDocumentSide.back,
                file: decodeDataUrl(documentSecond),
            });
        }

        if (signature) {
            await this.accountFiles.replaceSignature({ userId, file: decodeDataUrl(signature) });
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
