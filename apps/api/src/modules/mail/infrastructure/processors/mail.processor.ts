import { InjectQueue, OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";

import { Job, Queue } from "bullmq";

import { TelegramService } from "@common/telegram/telegram.service";
import {
    PORTAL_EVENTS_JOB_NAMES,
    PORTAL_EVENTS_QUEUE_NAME,
    type PortalRegistrationEmailConfirmedPayload,
} from "@modules/portal/crm/portals/events/portal-events.constants";

import { MailService } from "../../application/services/mail.service";
import { EmailType, MAIL_QUEUE_NAME, MAIL_WORKER_EVENTS } from "../../events/mail-events.constants";

export interface SendEmailJobData {
    to: string[];
    subject: string;
    html: string;
    context?: Record<string, unknown>;
    emailType?: EmailType;
    attachments?: Array<{
        filename: string;
        content: Buffer;
        cid?: string;
        contentType: string;
    }>;
}

@Processor(MAIL_QUEUE_NAME)
@Injectable()
export class MailProcessor extends WorkerHost {
    private readonly logger = new Logger(MailProcessor.name);

    constructor(
        private readonly mailService: MailService,
        private readonly telegramService: TelegramService,
        @InjectQueue(PORTAL_EVENTS_QUEUE_NAME) private readonly portalEventsQueue: Queue
    ) {
        super();
    }

    async process(job: Job<SendEmailJobData>): Promise<void> {
        const { to, subject, html, context, attachments } = job.data;

        try {
            await this.mailService.sendEmail({
                subject,
                html,
                to,
                context: context || {},
                attachments,
            });

            this.logger.log(`📧 Email successfully sent to ${to.join(", ")}`);
        } catch (error) {
            this.logger.error(
                `❌ Error sending email to ${to.join(", ")}: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            throw error; // Re-throw to mark job as failed
        }
    }

    @OnWorkerEvent(MAIL_WORKER_EVENTS.COMPLETED)
    async onCompleted(job: Job<SendEmailJobData>) {
        const { to, subject, emailType, context } = job.data;

        // Check if this is an email verification job
        if (emailType === EmailType.VERIFICATION) {
            try {
                await this.telegramService.sendEmailVerificationNotification({
                    email: to[0],
                    subject,
                });
                this.logger.log(`📱 Telegram notification sent for email verification to ${to[0]}`);
            } catch (error) {
                this.logger.error(
                    `❌ Failed to send Telegram notification: ${error instanceof Error ? error.message : String(error)}`
                );
            }
        }

        if (emailType === EmailType.PORTAL_REGISTRATION) {
            try {
                const ctx: Record<string, unknown> = { ...(context ?? {}) };
                const str = (k: string): string => {
                    const v = ctx[k];
                    return typeof v === "string" ? v : "";
                };
                const langRaw = ctx.language;
                const payload: PortalRegistrationEmailConfirmedPayload = {
                    portalId: str("portalId"),
                    portalSlug: str("portalSlug"),
                    portalDisplayName: str("portalDisplayName"),
                    ownerId: str("ownerId"),
                    ownerEmail: str("ownerEmail") || to[0] || "",
                    ownerName: str("ownerName"),
                    language:
                        typeof langRaw === "string"
                            ? (langRaw as PortalRegistrationEmailConfirmedPayload["language"])
                            : undefined,
                    emailSentAt: new Date().toISOString(),
                };

                await this.portalEventsQueue.add(
                    PORTAL_EVENTS_JOB_NAMES.PORTAL_REGISTRATION_EMAIL_CONFIRMED,
                    payload,
                    {
                        removeOnComplete: true,
                        removeOnFail: false,
                    }
                );
            } catch (error) {
                this.logger.error(
                    `❌ Failed to dispatch PortalRegistrationEmailConfirmed: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
        }
    }

    @OnWorkerEvent(MAIL_WORKER_EVENTS.FAILED)
    onFailed(job: Job<SendEmailJobData>, error: Error): void {
        const { to } = job.data;
        this.logger.error(`❌ Email job failed for ${to.join(", ")}: ${error.message}`);
    }

    onStarted(job: Job<SendEmailJobData>): void {
        const { to, subject } = job.data;
        this.logger.log(`📧 Email job started for ${to.join(", ")}: ${subject}`);
    }
}
