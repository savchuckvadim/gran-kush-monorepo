import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { PortalContextModule } from "@modules/portal/crm/portals/portal-context.module";

import { CabinetReviewsController } from "./api/controllers/cabinet-reviews.controller";
import { CabinetSpendingController } from "./api/controllers/cabinet-spending.controller";
import { CrmPortalSettingsController } from "./api/controllers/crm-portal-settings.controller";
import { PublicPortalsController } from "./api/controllers/public-portals.controller";

/** Публичная витрина (карта клубов), отзывы, кросс-клубные траты, настройки портала. */
@Module({
    imports: [PrismaModule, PortalContextModule],
    controllers: [
        PublicPortalsController,
        CabinetReviewsController,
        CabinetSpendingController,
        CrmPortalSettingsController,
    ],
})
export class PublicPortalModule {}
