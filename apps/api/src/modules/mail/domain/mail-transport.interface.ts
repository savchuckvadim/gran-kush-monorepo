export const MAIL_TRANSPORT = Symbol("MAIL_TRANSPORT");

export interface MailAttachment {
    filename: string;
    content: Buffer;
    cid?: string;
    contentType: string;
}

export interface OutgoingMail {
    from: string;
    to: string[];
    subject: string;
    html: string;
    attachments?: MailAttachment[];
}

/** Доставка уже собранного письма; рендер шаблонов и очередь — не его забота */
export interface MailTransport {
    send(mail: OutgoingMail): Promise<void>;
}
