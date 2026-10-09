import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { User } from "@prisma/client";
import { render } from "@react-email/components";
import { Queue } from "bullmq";

import {
    DEFAULT_EMAIL_FROM,
    DEFAULT_EMAIL_FROM_NAME,
    DEFAULT_LANGUAGE,
    EMAIL_SUBJECTS,
    JOB_OPTIONS,
    SupportedLanguage,
} from "../../consts/mail.constants";
import {
    MAIL_TRANSPORT,
    type MailAttachment,
    type MailTransport,
    type OutgoingMail,
} from "../../domain/mail-transport.interface";
import {
    EmailType,
    MAIL_QUEUE_JOB_NAMES,
    MAIL_QUEUE_NAME,
} from "../../events/mail-events.constants";
import { EmailVerificationTemplate } from "../../templates/email-verification.template";
import { PortalRegistrationTemplate } from "../../templates/portal-registration.template";
import { ResetPasswordTemplate } from "../../templates/reset-password.template";

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly smtpFrom: string;
    private readonly smtpFromName: string;
    // private readonly authCookieSpaDomain: string;
    // private readonly siteUrl: string;
    private readonly crmFrontendUrl: string;
    private readonly siteFrontendUrl: string;

    constructor(
        @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
        @InjectQueue(MAIL_QUEUE_NAME) private readonly queue: Queue,
        private readonly configService: ConfigService
    ) {
        this.smtpFrom = this.configService.get<string>("SMTP_FROM") || DEFAULT_EMAIL_FROM;
        this.smtpFromName =
            this.configService.get<string>("SMTP_FROM_NAME") || DEFAULT_EMAIL_FROM_NAME;
        // this.authCookieSpaDomain = this.configService.get<string>("AUTH_COOKIE_SPA_DOMAIN") || "";
        // this.siteUrl = this.configService.get<string>("SITE_URL") || "";
        this.crmFrontendUrl = this.configService.get<string>("CRM_FRONTEND_URL") || "";
        this.siteFrontendUrl = this.configService.get<string>("MEMBER_FRONTEND_URL") || "";
    }

    public async sendMamberEmailVerification(
        member: { name: string; surname: string | null },
        user: Pick<User, "id" | "email">,
        token: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE
    ) {
        const baseUrl = this.siteFrontendUrl;

        const html = await render(
            EmailVerificationTemplate({
                name: member.name,
                surname: member.surname,
                token,
                language: language,
                baseUrl,
            })
        );

        // Add email to queue for async processing
        await this.queue.add(
            MAIL_QUEUE_JOB_NAMES.SEND_EMAIL,
            {
                to: [user.email ?? DEFAULT_EMAIL_FROM],
                subject: EMAIL_SUBJECTS.VERIFICATION[language],
                html,
                context: {
                    name: member.name,
                },
                emailType: EmailType.VERIFICATION,
            },
            {
                removeOnComplete: JOB_OPTIONS.REMOVE_ON_COMPLETE,
                removeOnFail: JOB_OPTIONS.REMOVE_ON_FAIL,
            }
        );

        this.logger.log(`📬 Email verification queued for ${user.email}`);
        return true;
    }

    public async sendEmployeeEmailVerification(
        employee: { name: string; surname?: string | null },
        user: Pick<User, "id" | "email">,
        token: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE
    ) {
        const baseUrl = this.crmFrontendUrl;

        const html = await render(
            EmailVerificationTemplate({
                name: employee.name,
                surname: employee.surname,
                token,
                language: language,
                baseUrl,
            })
        );

        // Add email to queue for async processing
        await this.queue.add(
            MAIL_QUEUE_JOB_NAMES.SEND_EMAIL,
            {
                to: [user.email ?? DEFAULT_EMAIL_FROM],
                subject: EMAIL_SUBJECTS.VERIFICATION[language],
                html,
                context: {
                    name: employee.name,
                },
                emailType: EmailType.VERIFICATION,
            },
            {
                removeOnComplete: JOB_OPTIONS.REMOVE_ON_COMPLETE,
                removeOnFail: JOB_OPTIONS.REMOVE_ON_FAIL,
            }
        );

        this.logger.log(`📬 Employee email verification queued for ${user.email}`);
        return true;
    }

    public async sendPasswordReset(
        user: Pick<User, "id" | "email">,
        name: string,
        surname: string,
        token: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
        type: "crm" | "site" = "site"
    ) {
        const baseUrl = type === "crm" ? this.crmFrontendUrl : this.siteFrontendUrl;

        const html = await render(
            ResetPasswordTemplate({
                user,
                name,
                surname,
                token,
                baseUrl,
            })
        );

        // Add email to queue for async processing
        await this.queue.add(
            MAIL_QUEUE_JOB_NAMES.SEND_EMAIL,
            {
                to: [user.email ?? DEFAULT_EMAIL_FROM],
                subject: EMAIL_SUBJECTS.PASSWORD_RESET[language],
                html,
                context: {
                    name: user.email,
                },
                emailType: EmailType.PASSWORD_RESET,
            },
            {
                removeOnComplete: JOB_OPTIONS.REMOVE_ON_COMPLETE,
                removeOnFail: JOB_OPTIONS.REMOVE_ON_FAIL,
            }
        );

        this.logger.log(`📬 Password reset email queued for ${user.email}`);
        return true;
    }

    public async sendPortalRegistrationEmail(params: {
        portal: { id: string; name: string; displayName: string };
        owner: { id: string; email: string; name: string };
        language?: SupportedLanguage;
    }): Promise<boolean> {
        const language = params.language || DEFAULT_LANGUAGE;
        const baseUrl = this.crmFrontendUrl;
        const loginLink = `${baseUrl}/${language}/${params.portal.name}/auth/login`;
        const html = await render(
            PortalRegistrationTemplate({
                ownerName: params.owner.name,
                portalDisplayName: params.portal.displayName,
                loginLink,
                language,
                baseUrl,
            })
        );

        await this.queue.add(
            MAIL_QUEUE_JOB_NAMES.SEND_EMAIL,
            {
                to: [params.owner.email ?? DEFAULT_EMAIL_FROM],
                subject: EMAIL_SUBJECTS.PORTAL_REGISTRATION[language],
                html,
                context: {
                    portalId: params.portal.id,
                    portalSlug: params.portal.name,
                    portalDisplayName: params.portal.displayName,
                    ownerEmail: params.owner.email,
                    ownerName: params.owner.name,
                    ownerId: params.owner.id,
                    language,
                },
                emailType: EmailType.PORTAL_REGISTRATION,
            },
            {
                removeOnComplete: JOB_OPTIONS.REMOVE_ON_COMPLETE,
                removeOnFail: JOB_OPTIONS.REMOVE_ON_FAIL,
            }
        );

        this.logger.log(`📬 Portal registration email queued for ${params.owner.email}`);
        return true;
    }

    async sendEmail(params: {
        subject: string;
        html: string;
        to: string[];
        attachments?: MailAttachment[];
    }): Promise<boolean> {
        // В лог — только адресаты и тема: в html лежат ссылки с токенами подтверждения и сброса
        const recipients = params.to.join(", ");
        try {
            if (params.to.length === 0) {
                throw new Error("Email has no recipients");
            }

            const mail: OutgoingMail = {
                from: `"${this.smtpFromName}" <${this.smtpFrom}>`,
                to: params.to,
                subject: params.subject,
                html: params.html,
                attachments: params.attachments,
            };
            await this.transport.send(mail);
            this.logger.log(`Email sent to ${recipients}: ${params.subject}`);
            return true;
        } catch (error: unknown) {
            this.logger.error(
                `Error sending email to ${recipients}: ${params.subject}`,
                error instanceof Error ? error.stack : String(error)
            );
            return false;
        }
    }
}
