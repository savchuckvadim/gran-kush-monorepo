import { Injectable } from "@nestjs/common";

import { InvitationStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import { PortalRole, SYSTEM_ROLE_KEYS, SYSTEM_ROLES } from "../domain/portal-role";
import {
    PortalRoleRepository,
    PortalRoleWithUsage,
} from "../domain/portal-role-repository.interface";

type RoleRow = Prisma.PortalRoleGetPayload<object>;

const toRole = (row: RoleRow): PortalRole => ({
    id: row.id,
    portalId: row.portalId,
    key: row.key,
    name: row.name,
    isSystem: row.isSystem,
    permissions: row.permissions,
});

/** Порядок на экране: системные роли от широкой к узкой, затем свои по дате создания. */
const systemOrder = (key: string): number => {
    const index = SYSTEM_ROLES.findIndex((role) => role.key === key);
    return index === -1 ? SYSTEM_ROLES.length : index;
};

/**
 * Системные роли нового клуба. Вызывается в транзакции основания клуба, поэтому принимает клиент
 * транзакции, а не сервис.
 */
export const createSystemRoles = async (
    tx: Prisma.TransactionClient,
    portalId: string
): Promise<{ ownerRoleId: string }> => {
    let ownerRoleId = "";
    for (const role of SYSTEM_ROLES) {
        const created = await tx.portalRole.create({
            data: {
                portalId,
                key: role.key,
                isSystem: true,
                permissions: [...role.permissions],
            },
            select: { id: true },
        });
        if (role.key === SYSTEM_ROLE_KEYS.Owner) {
            ownerRoleId = created.id;
        }
    }
    return { ownerRoleId };
};

@Injectable()
export class PortalRolePrismaRepository extends PortalRoleRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async findAllByPortal(portalId: string): Promise<PortalRoleWithUsage[]> {
        const rows = await this.prisma.portalRole.findMany({
            where: { portalId },
            include: { _count: { select: { employees: true } } },
            orderBy: { createdAt: "asc" },
        });
        return rows
            .map((row) => ({ ...toRole(row), employeeCount: row._count.employees }))
            .sort((a, b) => systemOrder(a.key) - systemOrder(b.key));
    }

    async findById(id: string, portalId: string): Promise<PortalRole | null> {
        const row = await this.prisma.portalRole.findFirst({ where: { id, portalId } });
        return row ? toRole(row) : null;
    }

    async findWithUsage(id: string, portalId: string): Promise<PortalRoleWithUsage | null> {
        const row = await this.prisma.portalRole.findFirst({
            where: { id, portalId },
            include: { _count: { select: { employees: true } } },
        });
        return row ? { ...toRole(row), employeeCount: row._count.employees } : null;
    }

    async findByKey(portalId: string, key: string): Promise<PortalRole | null> {
        const row = await this.prisma.portalRole.findUnique({
            where: { portalId_key: { portalId, key } },
        });
        return row ? toRole(row) : null;
    }

    async create(
        portalId: string,
        data: { key: string; name: string; permissions: string[] }
    ): Promise<PortalRole> {
        const row = await this.prisma.portalRole.create({
            data: { portalId, key: data.key, name: data.name, permissions: data.permissions },
        });
        return toRole(row);
    }

    async update(
        id: string,
        data: Partial<{ name: string; permissions: string[] }>
    ): Promise<PortalRole> {
        const row = await this.prisma.portalRole.update({ where: { id }, data });
        return toRole(row);
    }

    async deleteUnused(id: string, portalId: string): Promise<boolean> {
        return this.prisma.$transaction(async (tx) => {
            const [employees, invitations] = await Promise.all([
                tx.employee.count({ where: { roleId: id } }),
                tx.employeeInvitation.count({
                    where: { roleId: id, status: InvitationStatus.pending },
                }),
            ]);
            if (employees > 0 || invitations > 0) {
                return false;
            }
            // Закрытые приглашения хранят роль ради истории — вместе с ролью уходят и они
            await tx.employeeInvitation.deleteMany({ where: { roleId: id } });
            const deleted = await tx.portalRole.deleteMany({ where: { id, portalId } });
            return deleted.count === 1;
        });
    }
}
