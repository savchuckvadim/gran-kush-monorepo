import { Logger } from "@nestjs/common";

import { Job } from "bullmq";

import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { QueueMemberFilesPayload } from "@modules/portal/crm/members/application/services/member-files.service";

import { MemberFilesProcessor } from "../member-files.processor";

const FILES_ATTEMPTS = 3;

const buildJob = (attemptsMade: number) =>
    ({
        id: "1",
        data: {
            userId: "u1",
            documentType: "dni",
            documentFirst: "data:image/png;base64,AAAA",
            documentSecond: "data:image/png;base64,BBBB",
            signature: "data:image/png;base64,CCCC",
        },
        attemptsMade,
        opts: { attempts: FILES_ATTEMPTS },
        updateData: jest.fn().mockResolvedValue(undefined),
    }) as unknown as Job<QueueMemberFilesPayload> & { updateData: jest.Mock };

const processor = new MemberFilesProcessor({} as AccountFilesService);

describe("MemberFilesProcessor — сканы не задерживаются в Redis", () => {
    beforeAll(() => Logger.overrideLogger(false));

    it("после сохранения base64 стирается, остальное остаётся", async () => {
        const job = buildJob(1);
        await processor.onCompleted(job);
        expect(job.updateData).toHaveBeenCalledWith({ userId: "u1", documentType: "dni" });
    });

    it("промежуточная неудача base64 не трогает — он нужен повтору", async () => {
        const job = buildJob(1);
        await processor.onFailed(job, new Error("S3 timeout"));
        expect(job.updateData).not.toHaveBeenCalled();
    });

    it("после последней попытки base64 стирается", async () => {
        const job = buildJob(FILES_ATTEMPTS);
        await processor.onFailed(job, new Error("S3 timeout"));
        expect(job.updateData).toHaveBeenCalledWith({ userId: "u1", documentType: "dni" });
    });
});
