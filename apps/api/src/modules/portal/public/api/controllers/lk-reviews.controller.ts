import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Put,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentAuthUser } from "@common/decorators/auth/current-auth-user.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import { PrismaService } from "@common/prisma/prisma.service";
import { RequireUserJwt } from "@modules/portal/auth/members/api/decorators/require-member-jwt.decorator";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { CreateReviewDto, ReviewDto } from "../dto/public-portals.dto";

/** Оценки клубов и товаров: доступны только member'ам соответствующего клуба (upsert). */
@ApiTags("LK Reviews")
@Controller("lk/reviews")
export class LkReviewsController {
    constructor(private readonly prisma: PrismaService) {}

    @Put("portals/:portalId")
    @RequireUserJwt()
    @ApiOperation({ summary: "Поставить/обновить оценку клубу (только member клуба)" })
    @ApiSuccessResponse(ReviewDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async reviewPortal(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("portalId") portalId: string,
        @Body() dto: CreateReviewDto
    ): Promise<ReviewDto> {
        await this.assertMembership(user.userId, portalId);

        const review = await this.prisma.portalReview.upsert({
            where: { portalId_userId: { portalId, userId: user.userId } },
            update: { score: dto.score, comment: dto.comment ?? null },
            create: {
                portalId,
                userId: user.userId,
                score: dto.score,
                comment: dto.comment ?? null,
            },
        });
        return {
            id: review.id,
            score: review.score,
            comment: review.comment,
            createdAt: review.createdAt.toISOString(),
        };
    }

    @Get("portals/:portalId")
    @RequireUserJwt()
    @ApiOperation({ summary: "Моя оценка клуба" })
    @ApiSuccessResponse(ReviewDto)
    @ApiErrorResponse([401, 404])
    async myPortalReview(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("portalId") portalId: string
    ): Promise<ReviewDto> {
        const review = await this.prisma.portalReview.findUnique({
            where: { portalId_userId: { portalId, userId: user.userId } },
        });
        if (!review) {
            throw new NotFoundException("Review not found");
        }
        return {
            id: review.id,
            score: review.score,
            comment: review.comment,
            createdAt: review.createdAt.toISOString(),
        };
    }

    @Put("products/:productId")
    @RequireUserJwt()
    @ApiOperation({ summary: "Поставить/обновить оценку товару (только member клуба товара)" })
    @ApiSuccessResponse(ReviewDto)
    @ApiErrorResponse([400, 401, 403, 404])
    async reviewProduct(
        @CurrentAuthUser() user: AuthenticatedUser,
        @Param("productId") productId: string,
        @Body() dto: CreateReviewDto
    ): Promise<ReviewDto> {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            select: { id: true, portalId: true },
        });
        if (!product) {
            throw new NotFoundException("Product not found");
        }
        await this.assertMembership(user.userId, product.portalId);

        const review = await this.prisma.productReview.upsert({
            where: { productId_userId: { productId, userId: user.userId } },
            update: { score: dto.score, comment: dto.comment ?? null },
            create: {
                portalId: product.portalId,
                productId,
                userId: user.userId,
                score: dto.score,
                comment: dto.comment ?? null,
            },
        });
        return {
            id: review.id,
            score: review.score,
            comment: review.comment,
            createdAt: review.createdAt.toISOString(),
        };
    }

    private async assertMembership(userId: string, portalId: string): Promise<void> {
        const member = await this.prisma.member.findUnique({
            where: { userId_portalId: { userId, portalId } },
            select: { isActive: true },
        });
        if (!member || !member.isActive) {
            throw new ForbiddenException("Only club members can leave reviews");
        }
    }
}
