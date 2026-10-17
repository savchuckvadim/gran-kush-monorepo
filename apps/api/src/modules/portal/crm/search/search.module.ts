import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmSearchController } from "./api/controllers/crm-search.controller";
import { CrmSearchService } from "./application/services/crm-search.service";
import { CrmSearchRepository } from "./domain/repositories/crm-search-repository.interface";
import { CrmSearchPrismaRepository } from "./infrastructure/repositories/crm-search-prisma.repository";

@Module({
    imports: [PrismaModule],
    controllers: [CrmSearchController],
    providers: [
        CrmSearchService,
        { provide: CrmSearchRepository, useClass: CrmSearchPrismaRepository },
    ],
})
export class SearchModule {}
