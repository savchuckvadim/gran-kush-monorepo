import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable } from "@nestjs/common";

import {
    MEMBER_FILES_QUEUE_JOB_NAMES,
    MEMBER_FILES_QUEUE_NAME,
} from "@members/events/member-files-events.constants";
import { Queue } from "bullmq";

export interface QueueMemberFilesPayload {
    memberId: string;
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

        const job = await this.queue.add(MEMBER_FILES_QUEUE_JOB_NAMES.SAVE_MEMBER_FILES, payload, {
            removeOnComplete: true,
            removeOnFail: false,
        });

        return {
            queued: true,
            jobId: String(job.id),
        };
    }
}
