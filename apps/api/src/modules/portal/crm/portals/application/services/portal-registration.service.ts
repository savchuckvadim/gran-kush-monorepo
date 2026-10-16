import { Injectable, Logger } from "@nestjs/common";

import { hash } from "bcrypt";

import { PrismaService } from "@common/prisma/prisma.service";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { EmailVerificationService } from "@modules/portal/auth/shared/application/services/email-verification.service";

import { CreateClubDto } from "../../api/dto/create-club.dto";
import { RegisterPortalDto } from "../../api/dto/register-portal.dto";

import { ClubFoundingService, emailTakenError, type FoundedClub } from "./club-founding.service";

export type RegisterPortalResult = {
    portal: { id: string; name: string; displayName: string; status: string };
    owner: { id: string; email: string; name: string; role: string; portalId: string };
    tokens: { accessToken: string; refreshToken: string };
};

/**
 * Club owners: a new account with its first club (registration from the product site) and one
 * more club for an account that is already signed in (a Google sign-in without a club ends there
 * too). The club itself is founded by `ClubFoundingService`.
 */
@Injectable()
export class PortalRegistrationService {
    private readonly logger = new Logger(PortalRegistrationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly founding: ClubFoundingService,
        private readonly employeeAuthService: EmployeeAuthService,
        private readonly emailVerificationService: EmailVerificationService
    ) {}

    /** A new account with a password; it signs in at once and confirms the email from a banner. */
    async registerPortal(dto: RegisterPortalDto, deviceId: string): Promise<RegisterPortalResult> {
        const email = dto.email.trim().toLowerCase();
        await this.founding.assertNameFree(dto.name);
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            throw emailTakenError();
        }

        const passwordHash = await hash(dto.password, 10);
        const club = await this.founding.inTransaction(async (tx) => {
            const user = await tx.user.create({
                data: { email, passwordHash, isActive: true, emailConfirmed: false },
            });
            return this.founding.found(tx, user.id, dto);
        });

        const result = await this.finish(club, dto, deviceId);
        // Владелец уже внутри CRM; письмо с подтверждением можно запросить повторно из баннера,
        // поэтому сбой постановки в очередь не должен ронять уже созданный клуб.
        try {
            await this.emailVerificationService.sendVerificationEmailToUserId(club.owner.user.id, {
                app: "crm",
                language: dto.locale,
            });
        } catch (error: unknown) {
            this.logger.error(
                `Email confirmation for portal ${club.portal.id} was not queued`,
                error instanceof Error ? error.stack : String(error)
            );
        }
        return result;
    }

    /** One more club for the account of the session; the session itself proves the account. */
    async createClubForAccount(
        account: { userId: string },
        dto: CreateClubDto,
        deviceId: string
    ): Promise<RegisterPortalResult> {
        await this.founding.assertNameFree(dto.name);
        const club = await this.founding.inTransaction((tx) =>
            this.founding.found(tx, account.userId, dto)
        );
        return this.finish(club, dto, deviceId);
    }

    /** A fresh CRM session for the owner and the club's welcome events. */
    private async finish(
        club: FoundedClub,
        dto: CreateClubDto,
        deviceId: string
    ): Promise<RegisterPortalResult> {
        const tokens = await this.employeeAuthService.generateTokens(
            { id: club.owner.user.id, email: club.owner.user.email },
            deviceId
        );
        await this.founding.announce(club, dto);
        return {
            portal: {
                id: club.portal.id,
                name: club.portal.name,
                displayName: club.portal.displayName,
                status: club.portal.status,
            },
            owner: {
                id: club.owner.id,
                email: club.owner.user.email,
                name: dto.ownerName.trim(),
                role: club.owner.role,
                portalId: club.owner.portalId,
            },
            tokens,
        };
    }
}
