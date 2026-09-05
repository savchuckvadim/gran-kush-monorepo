import {
    createTransport,
    type SMTPSentMessageInfo,
    type SMTPTransportOptions,
    type Transporter,
} from "nodemailer";

import type { MailTransport, OutgoingMail } from "../../domain/mail-transport.interface";

/**
 * Голый nodemailer вместо @nestjs-modules/mailer: письма рендерит React Email, а обёртка
 * тянула handlebars, liquidjs, mjml и preview-email с критичными CVE, не используя их.
 */
export class SmtpMailTransport implements MailTransport {
    private readonly transporter: Transporter<SMTPSentMessageInfo>;

    constructor(options: SMTPTransportOptions) {
        this.transporter = createTransport(options);
    }

    async send(mail: OutgoingMail): Promise<void> {
        await this.transporter.sendMail(mail);
    }
}
