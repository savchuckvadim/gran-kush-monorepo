import type { CleanupReport } from "../domain/cleanup-report";
import { type DiskUsage, freedBytes, usedPercent } from "../domain/disk-usage";

/*
 * Telegram texts. They go out with Markdown parsing (TelegramService), so free text from errors is
 * escaped. No personal data: only disk figures, the chat is outside the EEA.
 */

const GIB = 1024 ** 3;

export const formatGigabytes = (bytes: number): string =>
    `${(bytes / GIB).toLocaleString("ru-RU", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })} ГБ`;

export const escapeMarkdown = (text: string): string => text.replace(/([_*`[])/g, "\\$1");

const diskState = (usage: DiskUsage): string =>
    `${usedPercent(usage)}%, свободно ${formatGigabytes(usage.availableBytes)}`;

const freed = (report: CleanupReport): string =>
    formatGigabytes(freedBytes(report.before, report.after));

/** One line for the container log. */
export const describeReport = (report: CleanupReport): string =>
    [
        `${report.reason} cleanup:`,
        `images ${report.images ? report.images.removed : "failed"},`,
        `build cache ${report.buildCache ? report.buildCache.removed : "failed"},`,
        `freed ${freed(report)},`,
        `disk ${usedPercent(report.before)}% -> ${usedPercent(report.after)}%`,
    ].join(" ");

export const describeDisk = (usage: DiskUsage): string => diskState(usage);

export const nightlyReportMessage = (report: CleanupReport): string =>
    [
        "🧹 Ночная уборка Docker",
        `Освобождено ${freed(report)}`,
        `Диск: ${usedPercent(report.before)}% → ${diskState(report.after)}`,
    ].join("\n");

export const cleanupFailedMessage = (report: CleanupReport): string =>
    [
        "❗ Уборка Docker прошла с ошибками",
        ...report.errors.map((error) => `• ${escapeMarkdown(error)}`),
        `Освобождено ${freed(report)}, диск ${diskState(report.after)}`,
    ].join("\n");

export const pressureResolvedMessage = (report: CleanupReport): string =>
    [
        `⚠️ Диск сервера дошёл до ${usedPercent(report.before)}%`,
        `Уборка освободила ${freed(report)}, теперь ${diskState(report.after)}`,
    ].join("\n");

export const pressureAlertMessage = (usage: DiskUsage, report: CleanupReport | null): string =>
    [
        `🚨 Диск сервера заполнен на ${diskState(usage)}`,
        report
            ? `Уборка освободила только ${freed(report)}: место занимает не мусор Docker`
            : "Уборку уже запускали меньше получаса назад",
        "Что занимает место: docker system df и du -xh / --max-depth=2 на сервере",
    ].join("\n");

export const pressureReminderMessage = (usage: DiskUsage): string =>
    `🚨 Диск сервера всё ещё заполнен на ${diskState(usage)}`;

export const recoveredMessage = (usage: DiskUsage): string =>
    `✅ Диск сервера снова в норме: ${diskState(usage)}`;

export const dockerUnavailableMessage = (reason: string): string =>
    [
        `❗ Уборка диска не видит Docker: ${escapeMarkdown(reason)}`,
        "Проверить, что в контейнер pafpaf-janitor проброшен /var/run/docker.sock",
    ].join("\n");

export const jobFailedMessage = (job: string, reason: string): string =>
    `❗ Уборка диска, ${job}: ${escapeMarkdown(reason)}`;
