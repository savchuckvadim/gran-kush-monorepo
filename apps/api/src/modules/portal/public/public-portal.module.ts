import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmPortalSettingsController } from "./api/controllers/crm-portal-settings.controller";
import { LkReviewsController } from "./api/controllers/lk-reviews.controller";
import { LkSpendingController } from "./api/controllers/lk-spending.controller";
import { PublicPortalsController } from "./api/controllers/public-portals.controller";

/** Публичная витрина (карта клубов), отзывы, кросс-клубные траты, настройки портала. */
@Module({
    imports: [PrismaModule],
    controllers: [
        PublicPortalsController,
        LkReviewsController,
        LkSpendingController,
        CrmPortalSettingsController,
    ],
})
export class PublicPortalModule {}
