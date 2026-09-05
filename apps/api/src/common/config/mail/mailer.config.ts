import { ConfigService } from "@nestjs/config";

import type { SMTPTransportOptions } from "nodemailer";

export function getMailTransportConfig(configService: ConfigService): SMTPTransportOptions {
    return {
        host: configService.getOrThrow<string>("MAIL_HOST"),
        port: configService.getOrThrow<number>("MAIL_PORT"),
        secure: false,
        auth: {
            user: configService.getOrThrow<string>("MAIL_LOGIN"),
            pass: configService.getOrThrow<string>("MAIL_PASSWORD"),
        },
        // Унаследовано от прежней конфигурации: сертификат SMTP не проверяется.
        // Включать строгую проверку — отдельное решение, зависит от провайдера (security-audit TASK-306).
        tls: {
            rejectUnauthorized: false,
        },
    };
}
