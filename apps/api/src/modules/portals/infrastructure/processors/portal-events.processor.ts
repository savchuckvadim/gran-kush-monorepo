import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";

import { MailService } from "@mail/application/services/mail.service";
import { Job } from "bullmq";

import { APP_EVENTS } from "@common/events/events.constants";
import { TelegramService } from "@common/telegram/telegram.service";
import {
    PORTAL_EVENTS_JOB_NAMES,
    PORTAL_EVENTS_QUEUE_NAME,
    type PortalRegistrationEmailConfirmedPayload,
    type PortalRegistrationInitPayload,
} from "@modules/portals/events/portal-events.constants";

@Processor(PORTAL_EVENTS_QUEUE_NAME)
@Injectable()
export class PortalEventsProcessor extends WorkerHost {
    private readonly logger = new Logger(PortalEventsProcessor.name);

    constructor(
        private readonly mailService: MailService,
        private readonly telegramService: TelegramService
    ) {
        super();
    }

    async process(job: Job): Promise<void> {
        switch (job.name) {
            case PORTAL_EVENTS_JOB_NAMES.PORTAL_REGISTRATION_INIT: {
                const payload = job.data as PortalRegistrationInitPayload;

                // Admin notification should be immediate (not coupled to email sending).
                await this.telegramService.sendPortalRegistrationNotification({
                    ownerEmail: payload.ownerEmail,
                    ownerName: payload.ownerName,
                    portalSlug: payload.portalSlug,
                    portalDisplayName: payload.portalDisplayName,
                });

                await this.mailService.sendPortalRegistrationEmail({
                    portal: {
                        id: payload.portalId,
                        name: payload.portalSlug,
                        displayName: payload.portalDisplayName,
                    },
                    owner: {
                        id: payload.ownerId,
                        email: payload.ownerEmail,
                        name: payload.ownerName,
                    },
                    language: payload.language,
                });
                return;
            }

            case PORTAL_EVENTS_JOB_NAMES.PORTAL_REGISTRATION_EMAIL_CONFIRMED: {
                const payload = job.data as PortalRegistrationEmailConfirmedPayload;
                this.logger.log(
                    `Portal registration email confirmed: portalId=${payload.portalId} ownerEmail=${payload.ownerEmail}`
                );
                return;
            }

            default:
                this.logger.warn(`Unknown portal event job: ${String(job.name)}`);
                return;
        }
    }

    @OnWorkerEvent(APP_EVENTS.QUEUE.FAILED)
    onFailed(job: Job): void {
        this.logger.error(
            `Portal events job failed: jobId=${job.id} name=${String(job.name)} error=${String(job?.data)}`
        );
    }
}
