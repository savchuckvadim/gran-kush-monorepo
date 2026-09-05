import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Queue } from "bullmq";

import { MailService } from "../application/services/mail.service";
import type { MailTransport, OutgoingMail } from "../domain/mail-transport.interface";

const configStub = {
    get: (key: string): string | undefined =>
        ({ SMTP_FROM: "noreply@club.test", SMTP_FROM_NAME: "Club" })[key],
} as unknown as ConfigService;

const build = (send: MailTransport["send"]) =>
    new MailService({ send }, { add: jest.fn() } as unknown as Queue, configStub);

describe("MailService.sendEmail", () => {
    beforeAll(() => Logger.overrideLogger(false));

    it("собирает письмо с from из SMTP_FROM/SMTP_FROM_NAME и отдаёт транспорту", async () => {
        const send = jest.fn<Promise<void>, [OutgoingMail]>().mockResolvedValue(undefined);
        const attachments = [
            { filename: "a.png", content: Buffer.from("x"), contentType: "image/png" },
        ];

        const ok = await build(send).sendEmail({
            to: ["member@test.local"],
            subject: "Hi",
            html: "<p>hi</p>",
            attachments,
        });

        expect(ok).toBe(true);
        expect(send).toHaveBeenCalledWith({
            from: '"Club" <noreply@club.test>',
            to: ["member@test.local"],
            subject: "Hi",
            html: "<p>hi</p>",
            attachments,
        });
    });

    it("ошибка транспорта не всплывает — возвращает false", async () => {
        const send = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
        const ok = await build(send).sendEmail({
            to: ["member@test.local"],
            subject: "Hi",
            html: "<p>hi</p>",
        });
        expect(ok).toBe(false);
    });

    it("без адресатов не пытается отправлять", async () => {
        const send = jest.fn();
        const ok = await build(send).sendEmail({ to: [], subject: "Hi", html: "<p>hi</p>" });
        expect(ok).toBe(false);
        expect(send).not.toHaveBeenCalled();
    });
});
