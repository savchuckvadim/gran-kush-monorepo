import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ISendMailOptions, MailerService } from "@nestjs-modules/mailer";
import { Employee, Member, User } from "@prisma/client";
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
    EmailType,
    MAIL_QUEUE_JOB_NAMES,
    MAIL_QUEUE_NAME,
} from "../../events/mail-events.constants";
import { EmailVerificationTemplate } from "../../templates/email-verification.template";
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
        private readonly mailerService: MailerService,
        @InjectQueue(MAIL_QUEUE_NAME) private readonly queue: Queue,
        private readonly configService: ConfigService
    ) {
        this.smtpFrom = this.configService.get<string>("SMTP_FROM") || DEFAULT_EMAIL_FROM;
        this.smtpFromName =
            this.configService.get<string>("SMTP_FROM_NAME") || DEFAULT_EMAIL_FROM_NAME;
        // this.authCookieSpaDomain = this.configService.get<string>("AUTH_COOKIE_SPA_DOMAIN") || "";
        // this.siteUrl = this.configService.get<string>("SITE_URL") || "";
        this.crmFrontendUrl = this.configService.get<string>("CRM_FRONTEND_URL") || "";
        this.siteFrontendUrl = this.configService.get<string>("SITE_FRONTEND_URL") || "";
    }

    public async sendMamberEmailVerification(
        member: Member,
        user: User,
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
        employee: Employee,
        user: User,
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
        user: User,
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

    async sendEmail(params: {
        subject: string;
        html: string;
        to: string[];
        context: ISendMailOptions["context"];
        attachments?: Array<{
            filename: string;
            content: Buffer;
            cid?: string;
            contentType: string;
        }>;
    }) {
        try {
            const from = `"${this.smtpFromName}" <${this.smtpFrom}>`;

            const emailsList: string[] = params.to;

            if (!emailsList) {
                throw new Error(
                    `No recipients found in SMTP_TO env var, please check your .env file`
                );
            }

            const sendMailParams: ISendMailOptions = {
                to: emailsList,
                from: from,
                subject: params.subject,
                html: params.html,
                attachments: params.attachments,
            };
            const response = await this.mailerService.sendMail(sendMailParams);
            this.logger.log(
                `Email sent successfully to recipients with the following parameters : ${JSON.stringify(
                    sendMailParams
                )}`,
                response
            );
            return {
                ...response,
                message: "Email sent successfully",
            };
        } catch (error) {
            this.logger.error(
                `Error while sending mail with the following parameters : ${JSON.stringify(params)}`,
                error
            );
        }
    }
}
