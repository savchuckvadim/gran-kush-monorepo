import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";

import {
    PortalDataKeyRepository,
    type StoredPortalDataKey,
} from "../domain/portal-data-key.repository";

const SELECT = { version: true, wrappedKey: true, kekVersion: true } as const;

@Injectable()
export class PortalDataKeyPrismaRepository extends PortalDataKeyRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    findLatest(portalId: string, purpose: string): Promise<StoredPortalDataKey | null> {
        return this.prisma.portalDataKey.findFirst({
            where: { portalId, purpose },
            orderBy: { version: "desc" },
            select: SELECT,
        });
    }

    findVersion(
        portalId: string,
        purpose: string,
        version: number
    ): Promise<StoredPortalDataKey | null> {
        return this.prisma.portalDataKey.findUnique({
            where: { portalId_purpose_version: { portalId, purpose, version } },
            select: SELECT,
        });
    }

    async createFirstIfMissing(
        portalId: string,
        purpose: string,
        key: StoredPortalDataKey
    ): Promise<void> {
        await this.prisma.portalDataKey.createMany({
            data: [{ portalId, purpose, ...key }],
            skipDuplicates: true,
        });
    }
}
