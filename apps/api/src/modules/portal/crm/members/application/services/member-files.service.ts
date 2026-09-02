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

        const job = await this.queue.add(MEMBER_FILES_QUEUE_JOB_NAMES.SAVE_MEMBER_FILES, payload, {
            attempts: 3,
            backoff: { type: "exponential", delay: 5_000 },
            removeOnComplete: true,
            // Тело задачи — файлы в base64: упавшие задачи не должны жить в Redis вечно
            removeOnFail: { age: 24 * 60 * 60, count: 100 },
        });

        return {
            queued: true,
            jobId: String(job.id),
        };
    }
}
