import { Injectable, Logger } from "@nestjs/common";

import {
    DocumentAccessEntry,
    DocumentAccessLogRepository,
} from "@modules/account/domain/repositories/document-access-log-repository.interface";

/**
 * След по документам аккаунта: кто их загрузил, заменил, показал клубу, отозвал и кто из
 * клуба открывал. Нужен для разбора инцидентов и для ответа человеку на вопрос «кто смотрел
 * мой паспорт» (RGPD).
 *
 * Сбой записи журнала не отменяет само действие: участник не должен остаться без доступа к
 * клубу из-за отказавшей таблицы журнала. Зато он заметен в логе, а не молчит.
 */
@Injectable()
export class DocumentAccessLogService {
    private readonly logger = new Logger(DocumentAccessLogService.name);

    constructor(private readonly log: DocumentAccessLogRepository) {}

    async record(entry: DocumentAccessEntry): Promise<void> {
        try {
            await this.log.append(entry);
        } catch (error: unknown) {
            this.logger.error(
                `Document access log failed (${entry.action} ${entry.subject} of user ${entry.userId}): ${String(error)}`
            );
        }
    }
}
