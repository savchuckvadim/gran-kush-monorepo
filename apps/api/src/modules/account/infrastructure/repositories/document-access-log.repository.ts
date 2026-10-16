import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    DocumentAccessEntry,
    DocumentAccessLogRepository,
} from "@modules/account/domain/repositories/document-access-log-repository.interface";

@Injectable()
export class DocumentAccessLogPrismaRepository implements DocumentAccessLogRepository {
    constructor(private readonly prisma: PrismaService) {}

    async append(entry: DocumentAccessEntry): Promise<void> {
        await this.prisma.documentAccessLog.create({
            data: {
                userId: entry.userId,
                subject: entry.subject,
                documentId: entry.documentId ?? null,
                memberId: entry.memberId ?? null,
                portalId: entry.portalId ?? null,
                actorType: entry.actorType,
                actorId: entry.actorId ?? null,
                action: entry.action,
            },
        });
    }
}
