import { createTransport } from "nodemailer";

import { SmtpMailTransport } from "../infrastructure/transport/smtp-mail.transport";

jest.mock("nodemailer", () => ({ createTransport: jest.fn() }));

describe("SmtpMailTransport", () => {
    it("создаёт транспорт из SMTP-опций и передаёт письмо в sendMail как есть", async () => {
        const sendMail = jest.fn().mockResolvedValue({ messageId: "1" });
        (createTransport as jest.Mock).mockReturnValue({ sendMail });

        const options = { host: "smtp.test", port: 587, secure: false };
        const transport = new SmtpMailTransport(options);
        const mail = {
            from: '"Club" <noreply@club.test>',
            to: ["a@test.local"],
            subject: "Hi",
            html: "<p>hi</p>",
        };

        await transport.send(mail);

        expect(createTransport).toHaveBeenCalledWith(options);
        expect(sendMail).toHaveBeenCalledWith(mail);
    });
});
