import { ConflictException, Injectable } from "@nestjs/common";

import { EmployeeRole, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { FieldValuesService } from "@modules/portal/crm/entity-fields/application/services/field-values.service";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import {
    EmployeeFilters,
    EmployeeRepository,
    EmployeeWithProfile,
} from "@modules/portal/crm/employees/domain/repositories/employee-repository.interface";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

const employeeWithProfileInclude = {
    user: true,
    profile: {
        include: {
            fieldValues: {
                orderBy: [{ fieldDefinitionId: "asc" as const }, { valueIndex: "asc" as const }],
                include: { fieldDefinition: true },
            },
        },
    },
} as const satisfies Prisma.EmployeeInclude;

type EmployeeWithProfileRow = Prisma.EmployeeGetPayload<{
    include: typeof employeeWithProfileInclude;
}>;

function mapRow(row: EmployeeWithProfileRow): EmployeeWithProfile {
    return {
        employee: new Employee({
            id: row.id,
            userId: row.userId,
            portalId: row.portalId,
            entityRecordId: row.entityRecordId,
            email: row.user.email,
            role: row.role,
            isActive: row.isActive,
            lastLoginAt: row.lastLoginAt ?? undefined,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }),
        fields: row.profile.fieldValues.map((fv) => ({
            fieldKey: fv.fieldDefinition.fieldKey,
            type: fv.fieldDefinition.type,
            label: fv.fieldDefinition.labelOverride ?? fv.fieldDefinition.label,
            value: fv.valueJson,
        })),
    };
}

@Injectable()
export class EmployeePrismaRepository implements EmployeeRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly fieldValues: FieldValuesService
    ) {}

    async findByIdForPortal(id: string, portalId: string): Promise<EmployeeWithProfile | null> {
        const row = await this.prisma.employee.findFirst({
            where: { id, portalId },
            include: employeeWithProfileInclude,
        });
        return row ? mapRow(row) : null;
    }

    async findByUserAndPortal(
        userId: string,
        portalId: string
    ): Promise<EmployeeWithProfile | null> {
        const row = await this.prisma.employee.findUnique({
            where: { userId_portalId: { userId, portalId } },
            include: employeeWithProfileInclude,
        });
        return row ? mapRow(row) : null;
    }

    async findAllByPortal(
        portalId: string,
        filters?: EmployeeFilters,
        limit?: number,
        skip?: number
    ): Promise<EmployeeWithProfile[]> {
        const rows = await this.prisma.employee.findMany({
            where: this.buildPortalWhere(portalId, filters),
            take: limit,
            skip,
            include: employeeWithProfileInclude,
            orderBy: { createdAt: "desc" },
        });
        return rows.map(mapRow);
    }

    async countByPortal(portalId: string, filters?: EmployeeFilters): Promise<number> {
        return this.prisma.employee.count({ where: this.buildPortalWhere(portalId, filters) });
    }

    private buildPortalWhere(
        portalId: string,
        filters?: EmployeeFilters
    ): Prisma.EmployeeWhereInput {
        return {
            portalId,
            ...(filters?.role !== undefined && { role: filters.role }),
            ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        };
    }

    async createWithProfile(data: {
        userId: string;
        portalId: string;
        role: EmployeeRole;
        invitationId?: string;
        fields: Record<string, unknown>;
    }): Promise<EmployeeWithProfile> {
        const existing = await this.prisma.employee.findUnique({
            where: { userId_portalId: { userId: data.userId, portalId: data.portalId } },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictException("User is already an employee of this portal");
        }

        const row = await this.prisma.$transaction(async (tx) => {
            const def = await tx.entityDefinition.findUniqueOrThrow({
                where: {
                    portalId_code: {
                        portalId: data.portalId,
                        code: ENTITY_DEFINITION_CODES.EMPLOYEE,
                    },
                },
            });
            const record = await tx.entityRecord.create({
                data: {
                    portalId: data.portalId,
                    entityDefinitionId: def.id,
                },
            });
            const employee = await tx.employee.create({
                data: {
                    userId: data.userId,
                    portalId: data.portalId,
                    entityRecordId: record.id,
                    role: data.role,
                    invitationId: data.invitationId ?? null,
                },
            });
            await this.fieldValues.upsertRecordFieldValues(
                data.portalId,
                ENTITY_DEFINITION_CODES.EMPLOYEE,
                record.id,
                data.fields,
                tx
            );
            return tx.employee.findUniqueOrThrow({
                where: { id: employee.id },
                include: employeeWithProfileInclude,
            });
        });
        return mapRow(row);
    }

    async updateBridge(
        id: string,
        data: Partial<{
            role: EmployeeRole;
            isActive: boolean;
            lastLoginAt: Date;
        }>
    ): Promise<EmployeeWithProfile> {
        const row = await this.prisma.employee.update({
            where: { id },
            data,
            include: employeeWithProfileInclude,
        });
        return mapRow(row);
    }

    async updateProfileFields(
        id: string,
        portalId: string,
        fields: Record<string, unknown>
    ): Promise<EmployeeWithProfile> {
        const row = await this.prisma.$transaction(async (tx) => {
            const employee = await tx.employee.findFirstOrThrow({
                where: { id, portalId },
                select: { entityRecordId: true },
            });
            await this.fieldValues.upsertRecordFieldValues(
                portalId,
                ENTITY_DEFINITION_CODES.EMPLOYEE,
                employee.entityRecordId,
                fields,
                tx
            );
            return tx.employee.findUniqueOrThrow({
                where: { id },
                include: employeeWithProfileInclude,
            });
        });
        return mapRow(row);
    }

}
