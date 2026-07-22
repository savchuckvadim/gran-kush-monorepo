import { InjectQueue } from "@nestjs/bullmq";
import { ConflictException, Injectable } from "@nestjs/common";

import { EmployeeRole } from "@prisma/client";
import { hash } from "bcrypt";
import { Queue } from "bullmq";

import { PrismaService } from "@common/prisma/prisma.service";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import { PortalEntityMetadataService } from "@modules/portal/crm/entity-fields/application/services/portal-entity-metadata.service";
import { RegisterPortalDto } from "@modules/portal/crm/portals/api/dto/register-portal.dto";
import {
    PORTAL_EVENTS_JOB_NAMES,
    PORTAL_EVENTS_QUEUE_NAME,
    type PortalRegistrationInitPayload,
} from "@modules/portal/crm/portals/events/portal-events.constants";

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
        portalId: string;
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
        private readonly portalEntityMetadata: PortalEntityMetadataService,
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
            select: { id: true, passwordHash: true },
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

            await this.portalEntityMetadata.seedForPortal(portal.id, tx);

            const user = await tx.user.create({
                data: {
                    email: normalizedEmail,
                    passwordHash,
                    isActive: true,
                    emailConfirmed: true,
                },
            });

            const employeeDef = await tx.entityDefinition.findUniqueOrThrow({
                where: {
                    portalId_code: {
                        portalId: portal.id,
                        code: ENTITY_DEFINITION_CODES.EMPLOYEE,
                    },
                },
            });
            const record = await tx.entityRecord.create({
                data: {
                    portalId: portal.id,
                    entityDefinitionId: employeeDef.id,
                },
            });

            const employee = await tx.employee.create({
                data: {
                    portalId: portal.id,
                    userId: user.id,
                    entityRecordId: record.id,
                    role: EmployeeRole.portal_owner,
                    isActive: true,
                },
                include: {
                    user: true,
                },
            });

            const ownerFields: Record<string, string> = {
                first_name: dto.ownerName.trim(),
                ...(dto.ownerSurname?.trim() ? { last_name: dto.ownerSurname.trim() } : {}),
            };
            for (const [fieldKey, value] of Object.entries(ownerFields)) {
                const fieldDef = await tx.fieldDefinition.findUnique({
                    where: {
                        entityDefinitionId_fieldKey: {
                            entityDefinitionId: employeeDef.id,
                            fieldKey,
                        },
                    },
                    select: { id: true },
                });
                if (fieldDef) {
                    await tx.fieldValue.create({
                        data: {
                            portalId: portal.id,
                            entityRecordId: record.id,
                            fieldDefinitionId: fieldDef.id,
                            valueIndex: 0,
                            valueJson: value,
                        },
                    });
                }
            }

            return {
                portal,
                employee,
            };
        });

        const tokens = await this.employeeAuthService.generateTokens(
            { id: created.employee.user.id, email: created.employee.user.email },
            deviceId
        );

        const initPayload: PortalRegistrationInitPayload = {
            portalId: created.portal.id,
            portalSlug: created.portal.name,
            portalDisplayName: created.portal.displayName,
            ownerId: created.employee.id,
            ownerEmail: created.employee.user.email,
            ownerName: dto.ownerName.trim(),
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
                name: dto.ownerName.trim(),
                role: created.employee.role,
                portalId: created.employee.portalId,
            },
            tokens,
        };
    }
}
