import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmTimelineController } from "./api/controllers/crm-timeline.controller";
import { CommentsService } from "./application/comments.service";
import { TimelineService } from "./application/timeline.service";
import { CommentRepository, TimelineRepository } from "./domain/timeline-repository.interface";
import { CommentPrismaRepository } from "./infrastructure/comment-prisma.repository";
import { TimelineHydrator } from "./infrastructure/timeline-hydrator";
import { TimelinePrismaRepository } from "./infrastructure/timeline-prisma.repository";

/**
 * Таймлайн (TASK-782): история сущности из шины событий и комментарии персонала с закреплением.
 * Лента клуба (TASK-808) — тот же таймлайн с предметом `portal`.
 */
@Module({
    imports: [PrismaModule],
    controllers: [CrmTimelineController],
    providers: [
        TimelineService,
        CommentsService,
        TimelineHydrator,
        { provide: TimelineRepository, useClass: TimelinePrismaRepository },
        { provide: CommentRepository, useClass: CommentPrismaRepository },
    ],
})
export class TimelineModule {}
