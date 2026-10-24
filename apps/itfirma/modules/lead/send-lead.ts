import { createTransport } from "nodemailer";

import { SITE_NAME } from "@/modules/shared/config/site";

import type { LeadInput } from "./schema";

import "server-only";

interface MailChannel {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    to: string;
}

interface TelegramChannel {
    token: string;
    chatId: string;
}

const readMail = (): MailChannel | null => {
    const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM, LEAD_TO } = process.env;
    if (!MAIL_HOST || !MAIL_USER || !MAIL_PASS || !LEAD_TO) return null;
    return {
        host: MAIL_HOST,
        port: Number(MAIL_PORT ?? 587),
        user: MAIL_USER,
        pass: MAIL_PASS,
        from: MAIL_FROM || MAIL_USER,
        to: LEAD_TO,
    };
};

const readTelegram = (): TelegramChannel | null => {
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return null;
    return { token: TELEGRAM_BOT_TOKEN, chatId: TELEGRAM_CHAT_ID };
};

/** True when at least one channel is configured; the form is closed otherwise. */
export const hasLeadChannel = () => readMail() !== null || readTelegram() !== null;

const describe = (lead: LeadInput, ip: string) =>
    [
        `Nombre: ${lead.name}`,
        `E-mail: ${lead.email}`,
        lead.phone ? `Teléfono / Telegram: ${lead.phone}` : null,
        `Servicio: ${lead.service}`,
        `Presupuesto: ${lead.budget}`,
        `Idioma: ${lead.locale}`,
        `IP: ${ip}`,
        "",
        lead.message,
    ]
        .filter((line) => line !== null)
        .join("\n");

const sendMail = async (channel: MailChannel, lead: LeadInput, text: string) => {
    const transporter = createTransport({
        host: channel.host,
        port: channel.port,
        secure: channel.port === 465,
        auth: { user: channel.user, pass: channel.pass },
    });
    await transporter.sendMail({
        from: `${SITE_NAME} <${channel.from}>`,
        to: channel.to,
        replyTo: lead.email,
        subject: `[${SITE_NAME}] ${lead.service} — ${lead.name}`,
        text,
    });
};

const sendTelegram = async (channel: TelegramChannel, text: string) => {
    const response = await fetch(`https://api.telegram.org/bot${channel.token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: channel.chatId, text: `📩 ${SITE_NAME}\n\n${text}` }),
    });
    if (!response.ok) throw new Error(`telegram ${response.status}`);
};

/**
 * Delivers a request to every configured channel. One channel failing does not lose the lead
 * while another succeeds; all of them failing throws so the visitor gets an honest error.
 */
export const sendLead = async (lead: LeadInput, ip: string): Promise<void> => {
    const text = describe(lead, ip);
    const mail = readMail();
    const telegram = readTelegram();
    const results = await Promise.allSettled([
        mail ? sendMail(mail, lead, text) : Promise.reject(new Error("mail off")),
        telegram ? sendTelegram(telegram, text) : Promise.reject(new Error("telegram off")),
    ]);
    if (results.every((result) => result.status === "rejected")) {
        throw new AggregateError(
            results.map((result) => (result.status === "rejected" ? result.reason : null)),
            "lead not delivered"
        );
    }
};
