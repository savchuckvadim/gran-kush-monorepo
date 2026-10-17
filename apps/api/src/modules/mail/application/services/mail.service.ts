import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { User } from "@prisma/client";
import { render } from "@react-email/components";
import { Queue } from "bullmq";

import { buildJobId } from "@common/queue/job-options";

import {
    DEFAULT_EMAIL_FROM,
    DEFAULT_EMAIL_FROM_NAME,
    DEFAULT_LANGUAGE,
    EMAIL_SUBJECTS,
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
import { AccountExistsTemplate } from "../../templates/account-exists.template";
import { AccountSetupTemplate } from "../../templates/account-setup.template";
import { EmailVerificationTemplate } from "../../templates/email-verification.template";
import { EmployeeInvitationTemplate } from "../../templates/employee-invitation.template";
import { MembershipConsentTemplate } from "../../templates/membership-consent.template";
import { PortalRegistrationTemplate } from "../../templates/portal-registration.template";
import { ResetPasswordTemplate } from "../../templates/reset-password.template";
import { TelegramEmailTemplate } from "../../templates/telegram-email.template";

type AuthApp = "crm" | "member";

interface QueuedMail {
    to: string;
    subject: string;
    html: string;
    emailType: EmailType;
    context?: Record<string, unknown>;
    /** Фиксированный id — когда письмо должно уйти ровно один раз (см. `buildJobId`) */
    jobId?: string;
}

/**
 * Собирает письма из шаблонов и ставит их в очередь `mail`; отправляет `MailProcessor`
 * через `sendEmail`. Куда ведут ссылки — зависит от приложения: CRM для сотрудников,
 * кабинет участника для участников.
 */
@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly smtpFrom: string;
    private readonly smtpFromName: string;
    private readonly crmFrontendUrl: string;
    private readonly memberFrontendUrl: string;

    constructor(
        @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
        @InjectQueue(MAIL_QUEUE_NAME) private readonly queue: Queue,
        private readonly configService: ConfigService
    ) {
        this.smtpFrom = this.configService.get<string>("SMTP_FROM") || DEFAULT_EMAIL_FROM;
        this.smtpFromName =
            this.configService.get<string>("SMTP_FROM_NAME") || DEFAULT_EMAIL_FROM_NAME;
        this.crmFrontendUrl = this.configService.get<string>("CRM_FRONTEND_URL") || "";
        this.memberFrontendUrl = this.configService.get<string>("MEMBER_FRONTEND_URL") || "";
    }

    private frontendUrl(app: AuthApp): string {
        return app === "crm" ? this.crmFrontendUrl : this.memberFrontendUrl;
    }

    /**
     * Без jobId письмо может уйти повторно по кнопке «выслать ещё раз» — так и задумано:
     * дедупликация глушила бы повторную отправку, которую запросил сам пользователь.
     */
    private async enqueue(mail: QueuedMail): Promise<boolean> {
        const { to, jobId, ...rest } = mail;
        await this.queue.add(
            MAIL_QUEUE_JOB_NAMES.SEND_EMAIL,
            { to: [to], ...rest },
            jobId ? { jobId } : undefined
        );
        this.logger.log(`📬 ${mail.emailType} email queued for ${to}`);
        return true;
    }

    public async sendMemberEmailVerification(
        member: { name: string; surname: string | null },
        user: Pick<User, "id" | "email">,
        token: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE
    ): Promise<boolean> {
        return this.sendEmailVerification("member", member, user, token, language);
    }

    public async sendEmployeeEmailVerification(
        employee: { name: string; surname?: string | null },
        user: Pick<User, "id" | "email">,
        token: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE
    ): Promise<boolean> {
        return this.sendEmailVerification("crm", employee, user, token, language);
    }

    private async sendEmailVerification(
        app: AuthApp,
        recipient: { name: string; surname?: string | null },
        user: Pick<User, "id" | "email">,
        token: string,
        language: SupportedLanguage
    ): Promise<boolean> {
        const html = await render(
            EmailVerificationTemplate({
                name: recipient.name,
                surname: recipient.surname,
                token,
                language,
                baseUrl: this.frontendUrl(app),
            })
        );
        return this.enqueue({
            to: user.email,
            subject: EMAIL_SUBJECTS.VERIFICATION[language],
            html,
            context: { name: recipient.name },
            emailType: EmailType.VERIFICATION,
        });
    }

    public async sendPasswordReset(
        user: Pick<User, "id" | "email">,
        name: string,
        token: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
        type: "crm" | "site" = "site"
    ): Promise<boolean> {
        const html = await render(
            ResetPasswordTemplate({
                name,
                token,
                language,
                baseUrl: this.frontendUrl(type === "crm" ? "crm" : "member"),
            })
        );
        return this.enqueue({
            to: user.email,
            subject: EMAIL_SUBJECTS.PASSWORD_RESET[language],
            html,
            context: { name: user.email },
            emailType: EmailType.PASSWORD_RESET,
        });
    }

    public async sendPortalRegistrationEmail(params: {
        portal: { id: string; name: string; displayName: string };
        owner: { id: string; email: string; name: string };
        language?: SupportedLanguage;
    }): Promise<boolean> {
        const language = params.language || DEFAULT_LANGUAGE;
        const html = await render(
            PortalRegistrationTemplate({
                ownerName: params.owner.name,
                portalDisplayName: params.portal.displayName,
                loginLink: `${this.crmFrontendUrl}/${language}/${params.portal.name}/auth/login`,
                language,
            })
        );
        return this.enqueue({
            to: params.owner.email,
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
            // Приветственное письмо у портала одно: обработчик события портала повторяется
            // (TASK-111), и без фиксированного jobId каждый повтор слал бы ещё одну копию
            jobId: buildJobId(
                MAIL_QUEUE_JOB_NAMES.SEND_EMAIL,
                "portal-registration",
                params.portal.id
            ),
        });
    }

    /** Клуб добавил существующий аккаунт по email: владелец подтверждает членство (TASK-663). */
    public async sendMembershipConsent(params: {
        to: string;
        token: string;
        portalName: string;
        language?: SupportedLanguage;
    }): Promise<boolean> {
        const language = params.language || DEFAULT_LANGUAGE;
        const html = await render(
            MembershipConsentTemplate({
                portalName: params.portalName,
                token: params.token,
                language,
                baseUrl: this.crmFrontendUrl,
            })
        );
        return this.enqueue({
            to: params.to,
            subject: EMAIL_SUBJECTS.MEMBERSHIP_CONSENT[language],
            html,
            context: { portalName: params.portalName },
            emailType: EmailType.MEMBERSHIP_CONSENT,
        });
    }

    /** Аккаунт без пароля: ссылка задать пароль на странице «новый пароль» (TASK-664). */
    public async sendAccountSetup(params: {
        to: string;
        token: string;
        app: AuthApp;
        portalName?: string;
        language?: SupportedLanguage;
    }): Promise<boolean> {
        const language = params.language || DEFAULT_LANGUAGE;
        const baseUrl = this.frontendUrl(params.app);
        if (!baseUrl) {
            // Кабинет участника на проде может быть не поднят: ссылка в никуда хуже, чем без письма
            this.logger.warn(
                `Account setup email for ${params.to} skipped: frontend URL for "${params.app}" is not configured`
            );
            return false;
        }
        const html = await render(
            AccountSetupTemplate({
                token: params.token,
                portalName: params.portalName,
                language,
                baseUrl,
            })
        );
        return this.enqueue({
            to: params.to,
            subject: EMAIL_SUBJECTS.ACCOUNT_SETUP[language],
            html,
            context: { portalName: params.portalName },
            emailType: EmailType.ACCOUNT_SETUP,
        });
    }

    /** Регистрация на занятый адрес (TASK-665): владельцу — «аккаунт уже есть, войдите». */
    public async sendAccountExists(params: {
        to: string;
        language?: SupportedLanguage;
    }): Promise<boolean> {
        const language = params.language || DEFAULT_LANGUAGE;
        const baseUrl = this.frontendUrl("member");
        if (!baseUrl) {
            this.logger.warn(
                `Account exists email for ${params.to} skipped: cabinet URL is not configured`
            );
            return false;
        }
        const html = await render(AccountExistsTemplate({ language, baseUrl }));
        return this.enqueue({
            to: params.to,
            subject: EMAIL_SUBJECTS.ACCOUNT_EXISTS[language],
            html,
            emailType: EmailType.ACCOUNT_EXISTS,
        });
    }

    /** Шаг «укажите почту» после входа через Telegram: ссылка в то приложение, где входили. */
    public async sendTelegramEmailLink(params: {
        to: string;
        token: string;
        language?: SupportedLanguage;
        app?: "crm" | "member";
    }): Promise<boolean> {
        const language = params.language || DEFAULT_LANGUAGE;
        const baseUrl = this.frontendUrl(params.app ?? "member");
        if (!baseUrl) {
            this.logger.warn(
                `Telegram email for ${params.to} skipped: frontend URL is not configured`
            );
            return false;
        }
        const html = await render(
            TelegramEmailTemplate({ token: params.token, language, baseUrl })
        );
        return this.enqueue({
            to: params.to,
            subject: EMAIL_SUBJECTS.TELEGRAM_EMAIL[language],
            html,
            emailType: EmailType.TELEGRAM_EMAIL,
        });
    }

    /** Ссылка-приглашение сотрудника (TASK-662). */
    public async sendEmployeeInvitation(params: {
        to: string;
        token: string;
        portalName: string;
        language?: SupportedLanguage;
    }): Promise<boolean> {
        const language = params.language || DEFAULT_LANGUAGE;
        const html = await render(
            EmployeeInvitationTemplate({
                portalName: params.portalName,
                token: params.token,
                language,
                baseUrl: this.crmFrontendUrl,
            })
        );
        return this.enqueue({
            to: params.to,
            subject: EMAIL_SUBJECTS.EMPLOYEE_INVITATION[language],
            html,
            context: { portalName: params.portalName },
            emailType: EmailType.EMPLOYEE_INVITATION,
        });
    }

    /** Отправка из воркера очереди. */
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
