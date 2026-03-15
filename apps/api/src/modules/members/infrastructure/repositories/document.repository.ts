import { Injectable } from "@nestjs/common";

import { DocumentRepository } from "@members/domain/repositories/document-repository.interface";
import { Document } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class DocumentPrismaRepository implements DocumentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByType(type: string): Promise<Document | null> {
        return this.prisma.document.findUnique({
            where: { type },
        });
    }

    async findAll(): Promise<Document[]> {
        return this.prisma.document.findMany({
            where: { isActive: true },
            orderBy: { type: "asc" },
        });
    }

    async create(data: { type: string; name: string; description?: string }): Promise<Document> {
        return this.prisma.document.create({
            data,
        });
    }
}
