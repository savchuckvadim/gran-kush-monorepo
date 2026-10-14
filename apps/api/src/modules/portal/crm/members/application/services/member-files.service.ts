import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable } from "@nestjs/common";

import { Queue } from "bullmq";

import { validateDataUrl } from "@common/upload";
import {
    MEMBER_FILES_QUEUE_JOB_NAMES,
    MEMBER_FILES_QUEUE_NAME,
} from "@modules/portal/crm/members/events/member-files-events.constants";

/** Файлы сохраняются на уровень аккаунта (User), а не портального member. */
export interface QueueMemberFilesPayload {
    userId: string;
    documentType?: string;
    documentFirst?: string;
    documentSecond?: string;
    signature?: string;
}

@Injectable()
export class MemberFilesService {
    constructor(
        @InjectQueue(MEMBER_FILES_QUEUE_NAME)
        private readonly queue: Queue
    ) {}

    async queueUpload(
        payload: QueueMemberFilesPayload
    ): Promise<{ queued: boolean; jobId: string }> {
        this.assertValid(payload);

        // Повторы и срок хранения — в defaultJobOptions очереди (@common/queue/job-options).
        // Без jobId: участник может осознанно перезалить документы, и вторая загрузка
        // не должна молча потеряться в дедупликации.
        const job = await this.queue.add(MEMBER_FILES_QUEUE_JOB_NAMES.SAVE_MEMBER_FILES, payload);

        return {
            queued: true,
            jobId: String(job.id),
        };
    }

    /** Отдельно от постановки в очередь: регистрация проверяет файлы до создания аккаунта. */
    assertValid(payload: Omit<QueueMemberFilesPayload, "userId">): void {
        if (!payload.documentFirst && !payload.documentSecond && !payload.signature) {
            throw new BadRequestException(
                "At least one file (document or signature) must be provided."
            );
        }

        if ((payload.documentFirst || payload.documentSecond) && !payload.documentType) {
            throw new BadRequestException(
                "documentType is required when identity documents are provided."
            );
        }

        // Содержимое проверяется до постановки в очередь: клиент получает 400 сразу,
        // а не «queued» с молчаливым падением воркера, и мусор не оседает в Redis
        if (payload.documentFirst) validateDataUrl(payload.documentFirst, "document");
        if (payload.documentSecond) validateDataUrl(payload.documentSecond, "document");
        if (payload.signature) validateDataUrl(payload.signature, "signature");
    }
}
