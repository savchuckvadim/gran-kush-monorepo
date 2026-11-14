import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";

import { Job, UnrecoverableError } from "bullmq";

import { maskEmails } from "@common/logging/mask-email";
import { dropJobSecrets, isFinalAttempt } from "@common/queue/drop-job-secrets";
import { TelegramService } from "@common/telegram/telegram.service";

import { MailService } from "../../application/services/mail.service";
import { EmailType, MAIL_QUEUE_NAME, MAIL_WORKER_EVENTS } from "../../events/mail-events.constants";

export interface SendEmailJobData {
    to: string[];
    subject: string;
    /**
     * Тело письма со ссылками подтверждения, сброса и приглашений. Стирается из Redis после
     * отправки и после последней попытки (`dropJobSecrets`), поэтому у завершённой задачи его нет.
     */
    html?: string;
    context?: Record<string, unknown>;
    emailType?: EmailType;
    attachments?: Array<{
        filename: string;
        content: Buffer;
        cid?: string;
        contentType: string;
    }>;
}

/** Поля письма, которые не держим в Redis дольше отправки: ссылки с токенами и вложения. */
const MAIL_SECRET_KEYS = ["html", "attachments"] as const;

@Processor(MAIL_QUEUE_NAME)
@Injectable()
export class MailProcessor extends WorkerHost {
    private readonly logger = new Logger(MailProcessor.name);

    constructor(
        private readonly mailService: MailService,
        private readonly telegramService: TelegramService
    ) {
        super();
    }

    /**
     * `sendEmail` не бросает, а возвращает false, — здесь неудача превращается в ошибку задачи,
     * иначе повторы из `MAIL_JOB_OPTIONS` не срабатывают и письмо теряется молча.
     */
    async process(job: Job<SendEmailJobData>): Promise<void> {
        const { to, subject, html, attachments } = job.data;
        if (html === undefined) {
            // Тело уже стёрто — повторный запуск завершённой задачи отправил бы пустое письмо
            throw new UnrecoverableError("Email body is no longer available");
        }

        const sent = await this.mailService.sendEmail({ subject, html, to, attachments });
        if (!sent) {
            throw new Error(`Email to ${maskEmails(to)} was not sent`);
        }
    }

    @OnWorkerEvent(MAIL_WORKER_EVENTS.COMPLETED)
    async onCompleted(job: Job<SendEmailJobData>): Promise<void> {
        const { subject, emailType } = job.data;
        await dropJobSecrets(job, MAIL_SECRET_KEYS);

        if (emailType === EmailType.VERIFICATION) {
            try {
                await this.telegramService.sendEmailVerificationNotification({ subject });
                this.logger.log(`📱 Telegram notification sent for email verification`);
            } catch (error) {
                this.logger.error(
                    `❌ Failed to send Telegram notification: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }
    }

    @OnWorkerEvent(MAIL_WORKER_EVENTS.FAILED)
    async onFailed(job: Job<SendEmailJobData>, error: Error): Promise<void> {
        const attempt = `${job.attemptsMade}/${job.opts.attempts ?? 1}`;
        this.logger.error(
            `❌ Email job failed for ${maskEmails(job.data.to)} (attempt ${attempt}): ${error.message}`
        );
        if (isFinalAttempt(job)) {
            await dropJobSecrets(job, MAIL_SECRET_KEYS);
        }
    }
}
