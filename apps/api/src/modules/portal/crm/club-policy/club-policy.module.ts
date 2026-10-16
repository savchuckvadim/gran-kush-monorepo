import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CabinetShopAccessController } from "./api/controllers/cabinet-shop-access.controller";
import { CrmClubPolicyController } from "./api/controllers/crm-club-policy.controller";
import { ShopAccessGuard } from "./api/guards/shop-access.guard";
import { ClubPolicyService } from "./application/services/club-policy.service";
import { MemberAccessService } from "./application/services/member-access.service";
import { MemberLimitService } from "./application/services/member-limit.service";
import { ClubPolicyRepository } from "./domain/repositories/club-policy-repository.interface";
import { ClubPolicyPrismaRepository } from "./infrastructure/repositories/club-policy-prisma.repository";

/** Правила клуба для участников и доступ участника к каталогу и заказу. */
@Module({
    imports: [PrismaModule],
    controllers: [CrmClubPolicyController, CabinetShopAccessController],
    providers: [
        ClubPolicyService,
        MemberAccessService,
        MemberLimitService,
        ShopAccessGuard,
        { provide: ClubPolicyRepository, useClass: ClubPolicyPrismaRepository },
    ],
    exports: [ClubPolicyService, MemberAccessService, MemberLimitService, ShopAccessGuard],
})
export class ClubPolicyModule {}
