import { Logger } from "@nestjs/common";

import { Job, UnrecoverableError } from "bullmq";

import { TelegramService } from "@common/telegram/telegram.service";

import { MailService } from "../application/services/mail.service";
import { EmailType } from "../events/mail-events.constants";
import { MailProcessor, SendEmailJobData } from "../infrastructure/processors/mail.processor";

const MAIL_ATTEMPTS = 5;

type UpdateDataMock = jest.Mock<Promise<void>, [SendEmailJobData]>;

const buildJob = (overrides: Partial<Job<SendEmailJobData>> = {}) => {
    const job = {
        id: "1",
        data: {
            to: ["member@club.es"],
            subject: "Reset",
            html: "<a href='https://crm/reset?token=secret'>reset</a>",
            emailType: EmailType.PASSWORD_RESET,
        },
        attemptsMade: 0,
        opts: { attempts: MAIL_ATTEMPTS },
        updateData: jest.fn().mockResolvedValue(undefined),
        ...overrides,
    };
    return job as unknown as Job<SendEmailJobData> & { updateData: UpdateDataMock };
};

const build = (sendEmail: jest.Mock) =>
    new MailProcessor(
        { sendEmail } as unknown as MailService,
        { sendEmailVerificationNotification: jest.fn() } as unknown as TelegramService
    );

describe("MailProcessor", () => {
    beforeAll(() => Logger.overrideLogger(false));

    it("неудачная отправка — ошибка задачи, чтобы сработали повторы", async () => {
        const processor = build(jest.fn().mockResolvedValue(false));
        await expect(processor.process(buildJob())).rejects.toThrow("was not sent");
    });

    it("успешная отправка — задача завершается", async () => {
        const sendEmail = jest.fn().mockResolvedValue(true);
        await expect(build(sendEmail).process(buildJob())).resolves.toBeUndefined();
        expect(sendEmail).toHaveBeenCalledTimes(1);
    });

    it("задача без тела не отправляет пустое письмо и не повторяется", async () => {
        const sendEmail = jest.fn();
        const job = buildJob();
        delete job.data.html;
        await expect(build(sendEmail).process(job)).rejects.toBeInstanceOf(UnrecoverableError);
        expect(sendEmail).not.toHaveBeenCalled();
    });

    it("после отправки тело письма стирается из Redis", async () => {
        const job = buildJob();
        await build(jest.fn()).onCompleted(job);
        const data = job.updateData.mock.calls[0]?.[0];
        expect(data?.html).toBeUndefined();
        expect(data?.to).toEqual(["member@club.es"]);
    });

    it("промежуточная неудача тело не трогает — оно нужно повтору", async () => {
        const job = buildJob({ attemptsMade: 2 });
        await build(jest.fn()).onFailed(job, new Error("ECONNREFUSED"));
        expect(job.updateData).not.toHaveBeenCalled();
    });

    it("после последней попытки тело стирается", async () => {
        const job = buildJob({ attemptsMade: MAIL_ATTEMPTS });
        await build(jest.fn()).onFailed(job, new Error("ECONNREFUSED"));
        const data = job.updateData.mock.calls[0]?.[0];
        expect(data?.html).toBeUndefined();
    });

    it("задачу уже удалили — стирание не падает", async () => {
        const job = buildJob({ updateData: jest.fn().mockRejectedValue(new Error("Missing key")) });
        await expect(build(jest.fn()).onCompleted(job)).resolves.toBeUndefined();
    });
});
