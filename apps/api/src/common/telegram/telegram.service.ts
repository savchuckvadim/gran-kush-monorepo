import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface EmailVerificationNotification {
    email: string;
    subject: string;
}

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);
    private readonly botToken: string | undefined;
    private readonly chatId: string | undefined;

    constructor(private readonly configService: ConfigService) {
        this.botToken = this.configService.get<string>("TG_BOT_API_KEY");
        this.chatId = this.configService.get<string>("TG_BOT_CHAT_ID");
    }

    async sendEmailVerificationNotification(data: EmailVerificationNotification): Promise<void> {
        if (!this.botToken || !this.chatId) {
            this.logger.warn("Telegram bot credentials not configured. Skipping notification.");
            return;
        }

        const message = `📧 *Email Verification Sent*

📬 Email: ${data.email}
📝 Subject: ${data.subject}
⏰ Time: ${new Date().toLocaleString()}`;

        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: "Markdown",
                }),
            });

            if (!response.ok) {
                const errorData: unknown = await response.json();
                throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
            }

            this.logger.log(`✅ Telegram notification sent successfully`);
        } catch (error) {
            this.logger.error(
                `❌ Failed to send Telegram notification: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }

    async sendMessage(text: string): Promise<void> {
        if (!this.botToken || !this.chatId) {
            this.logger.warn("Telegram bot credentials not configured. Skipping notification.");
            return;
        }

        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text,
                    parse_mode: "Markdown",
                }),
            });

            if (!response.ok) {
                const errorData: unknown = await response.json();
                throw new Error(`Telegram API error: ${JSON.stringify(errorData)}`);
            }

            this.logger.log(`✅ Telegram message sent successfully`);
        } catch (error) {
            this.logger.error(
                `❌ Failed to send Telegram message: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
        }
    }
}
