import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { FieldOption, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import type {
    CreatePortalMemberFieldDto,
    UpdatePortalMemberFieldDto,
} from "@modules/portal/crm/entity-fields/api/dto/portal-field-settings.dto";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

export type MemberFieldDefinitionWithOptions = Prisma.FieldDefinitionGetPayload<{
    include: { options: { orderBy: { sortOrder: "asc" } } };
}>;

@Injectable()
export class PortalFieldSettingsService {
    constructor(private readonly prisma: PrismaService) {}

    private async memberEntityDefinitionId(portalId: string): Promise<string> {
        const ed = await this.prisma.entityDefinition.findUnique({
            where: {
                portalId_code: { portalId, code: ENTITY_DEFINITION_CODES.MEMBER },
            },
        });
        if (!ed) {
            throw new NotFoundException("Member entity definition not found for portal");
        }
        return ed.id;
    }

    async listMemberDefinitions(portalId: string): Promise<MemberFieldDefinitionWithOptions[]> {
        const entityDefinitionId = await this.memberEntityDefinitionId(portalId);
        return this.prisma.fieldDefinition.findMany({
            where: { entityDefinitionId },
            orderBy: [{ sortOrder: "asc" }, { fieldKey: "asc" }],
            include: {
                options: { orderBy: { sortOrder: "asc" } },
            },
        });
    }

    async createMemberDefinition(
        portalId: string,
        dto: CreatePortalMemberFieldDto
    ): Promise<MemberFieldDefinitionWithOptions> {
        const entityDefinitionId = await this.memberEntityDefinitionId(portalId);
        try {
            return await this.prisma.fieldDefinition.create({
                data: {
                    entityDefinitionId,
                    fieldKey: dto.fieldKey,
                    type: dto.type,
                    label: dto.label,
                    helpText: dto.helpText ?? null,
                    isSystem: false,
                    isImmutable: false,
                    deletableByPortal: true,
                    customizableByPortal: true,
                    isMultiple: dto.isMultiple ?? false,
                    showInFilters: dto.showInFilters ?? false,
                    sortOrder: dto.sortOrder ?? 900,
                    validationJson: dto.validationJson as Prisma.InputJsonValue | undefined,
                    options:
                        dto.options && dto.options.length > 0
                            ? {
                                  create: dto.options.map((o) => ({
                                      valueKey: o.valueKey,
                                      label: o.label,
                                      color: o.color ?? null,
                                      sortOrder: o.sortOrder ?? 0,
                                  })),
                              }
                            : undefined,
                },
                include: { options: true },
            });
        } catch (e: unknown) {
            if (this.isPrismaUniqueViolation(e)) {
                throw new ConflictException(`Field key "${dto.fieldKey}" already exists`);
            }
            throw e;
        }
    }

    async updateMemberDefinition(
        portalId: string,
        fieldKey: string,
        dto: UpdatePortalMemberFieldDto
    ) {
        const entityDefinitionId = await this.memberEntityDefinitionId(portalId);
        const def = await this.prisma.fieldDefinition.findUnique({
            where: {
                entityDefinitionId_fieldKey: { entityDefinitionId, fieldKey },
            },
        });
        if (!def) {
            throw new NotFoundException(`Field "${fieldKey}" not found`);
        }
        if (def.isImmutable) {
            throw new BadRequestException("Cannot modify immutable field");
        }
        if (!def.customizableByPortal && (dto.label !== undefined || dto.helpText !== undefined)) {
            throw new BadRequestException("Field is not customizable by portal");
        }

        return this.prisma.fieldDefinition.update({
            where: { id: def.id },
            data: {
                ...(dto.label !== undefined && { label: dto.label }),
                ...(dto.helpText !== undefined && { helpText: dto.helpText }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
                ...(dto.showInFilters !== undefined && { showInFilters: dto.showInFilters }),
                ...(dto.isMultiple !== undefined && { isMultiple: dto.isMultiple }),
                ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
                ...(dto.validationJson !== undefined && {
                    validationJson:
                        dto.validationJson === null
                            ? Prisma.JsonNull
                            : (dto.validationJson as Prisma.InputJsonValue),
                }),
            },
            include: { options: true },
        });
    }

    async deleteMemberDefinition(portalId: string, fieldKey: string) {
        const entityDefinitionId = await this.memberEntityDefinitionId(portalId);
        const def = await this.prisma.fieldDefinition.findUnique({
            where: {
                entityDefinitionId_fieldKey: { entityDefinitionId, fieldKey },
            },
        });
        if (!def) {
            throw new NotFoundException(`Field "${fieldKey}" not found`);
        }
        if (def.isImmutable || !def.deletableByPortal) {
            throw new BadRequestException("Cannot delete this field");
        }

        await this.prisma.$transaction([
            this.prisma.fieldValue.deleteMany({ where: { fieldDefinitionId: def.id } }),
            this.prisma.formDefinitionItem.deleteMany({ where: { fieldDefinitionId: def.id } }),
            this.prisma.fieldOption.deleteMany({ where: { fieldDefinitionId: def.id } }),
            this.prisma.fieldDefinition.delete({ where: { id: def.id } }),
        ]);
    }

    async addMemberFieldOption(
        portalId: string,
        fieldKey: string,
        input: { valueKey: string; label: string; color?: string | null; sortOrder?: number }
    ): Promise<FieldOption> {
        const entityDefinitionId = await this.memberEntityDefinitionId(portalId);
        const def = await this.prisma.fieldDefinition.findUnique({
            where: {
                entityDefinitionId_fieldKey: { entityDefinitionId, fieldKey },
            },
        });
        if (!def) {
            throw new NotFoundException(`Field "${fieldKey}" not found`);
        }
        try {
            return await this.prisma.fieldOption.create({
                data: {
                    fieldDefinitionId: def.id,
                    valueKey: input.valueKey,
                    label: input.label,
                    color: input.color ?? null,
                    sortOrder: input.sortOrder ?? 0,
                },
            });
        } catch (e: unknown) {
            if (this.isPrismaUniqueViolation(e)) {
                throw new ConflictException(`Option "${input.valueKey}" already exists`);
            }
            throw e;
        }
    }

    private isPrismaUniqueViolation(e: unknown): boolean {
        return (
            typeof e === "object" &&
            e !== null &&
            "code" in e &&
            (e as { code: string }).code === "P2002"
        );
    }
}
