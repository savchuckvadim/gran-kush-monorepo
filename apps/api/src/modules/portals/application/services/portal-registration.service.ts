import { InjectQueue } from "@nestjs/bullmq";
import { ConflictException, Injectable } from "@nestjs/common";

import { EmployeeAuthService } from "@auth/employees/application/services/employee-auth.service";
import { hash } from "bcrypt";
import { Queue } from "bullmq";

import { PrismaService } from "@common/prisma/prisma.service";
import { mapToEntity } from "@modules/employees";
import { RegisterPortalDto } from "@modules/portals/api/dto/register-portal.dto";
import {
    PORTAL_EVENTS_JOB_NAMES,
    PORTAL_EVENTS_QUEUE_NAME,
    type PortalRegistrationInitPayload,
} from "@modules/portals/events/portal-events.constants";

type RegisterPortalResult = {
    portal: {
        id: string;
        name: string;
        displayName: string;
        status: string;
    };
    owner: {
        id: string;
        email: string;
        name: string;
        role: string;
        portalId: string | null;
    };
    tokens: {
        accessToken: string;
        refreshToken: string;
    };
};

@Injectable()
export class PortalRegistrationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly employeeAuthService: EmployeeAuthService,
        @InjectQueue(PORTAL_EVENTS_QUEUE_NAME) private readonly portalEventsQueue: Queue
    ) {}

    async registerPortal(dto: RegisterPortalDto, deviceId: string): Promise<RegisterPortalResult> {
        const normalizedName = dto.name.trim().toLowerCase();
        const normalizedEmail = dto.email.trim().toLowerCase();

        const existingPortal = await this.prisma.portal.findUnique({
            where: { name: normalizedName },
            select: { id: true },
        });
        if (existingPortal) {
            throw new ConflictException("Portal with this name already exists");
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true },
        });
        if (existingUser) {
            throw new ConflictException("User with this email already exists");
        }

        const passwordHash = await hash(dto.password, 10);

        const created = await this.prisma.$transaction(async (tx) => {
            const portal = await tx.portal.create({
                data: {
                    name: normalizedName,
                    displayName: dto.displayName.trim(),
                },
            });

            const user = await tx.user.create({
                data: {
                    portalId: portal.id,
                    email: normalizedEmail,
                    passwordHash,
                    isActive: true,
                    emailConfirmed: true,
                },
            });

            const employee = await tx.employee.create({
                data: {
                    portalId: portal.id,
                    userId: user.id,
                    name: dto.ownerName.trim(),
                    surname: dto.ownerSurname?.trim() || null,
                    role: "portal_owner",
                    position: "Owner",
                    department: "Management",
                    isActive: true,
                },
                include: {
                    user: true,
                },
            });

            return {
                portal,
                employee,
            };
        });

        const employeeEntity = mapToEntity(created.employee, created.employee.user);

        const tokens = await this.employeeAuthService.generateTokens(employeeEntity, deviceId);

        const initPayload: PortalRegistrationInitPayload = {
            portalId: created.portal.id,
            portalSlug: created.portal.name,
            portalDisplayName: created.portal.displayName,
            ownerId: created.employee.id,
            ownerEmail: created.employee.user.email,
            ownerName: created.employee.name,
        };

        // Portal events are processed asynchronously in PortalEventsProcessor.
        await this.portalEventsQueue.add(
            PORTAL_EVENTS_JOB_NAMES.PORTAL_REGISTRATION_INIT,
            initPayload,
            {
                removeOnComplete: true,
                removeOnFail: false,
            }
        );

        return {
            portal: {
                id: created.portal.id,
                name: created.portal.name,
                displayName: created.portal.displayName,
                status: created.portal.status,
            },
            owner: {
                id: created.employee.id,
                email: created.employee.user.email,
                name: created.employee.name,
                role: created.employee.role,
                portalId: created.employee.portalId,
            },
            tokens,
        };
    }
}
