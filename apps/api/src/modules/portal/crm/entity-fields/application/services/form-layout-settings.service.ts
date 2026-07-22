import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { FormPurpose } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import type { FormLayoutItemInputDto } from "@modules/portal/crm/entity-fields/api/dto/portal-field-settings.dto";

@Injectable()
export class FormLayoutSettingsService {
    constructor(private readonly prisma: PrismaService) {}

    /** Полная замена layout формы (purpose) любой сущности портала. */
    async replaceFormLayout(
        portalId: string,
        entityCode: string,
        purpose: FormPurpose,
        items: FormLayoutItemInputDto[]
    ): Promise<{ purpose: FormPurpose; replaced: number }> {
        const ed = await this.prisma.entityDefinition.findUnique({
            where: {
                portalId_code: { portalId, code: entityCode },
            },
        });
        if (!ed) {
            throw new NotFoundException(`Entity "${entityCode}" not found`);
        }

        const form = await this.prisma.formDefinition.upsert({
            where: {
                portalId_entityDefinitionId_purpose: {
                    portalId,
                    entityDefinitionId: ed.id,
                    purpose,
                },
            },
            update: {},
            create: {
                portalId,
                entityDefinitionId: ed.id,
                purpose,
            },
        });

        await this.prisma.$transaction(async (tx) => {
            await tx.formDefinitionItem.deleteMany({ where: { formDefinitionId: form.id } });

            const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
            for (const row of sorted) {
                const def = await tx.fieldDefinition.findUnique({
                    where: {
                        entityDefinitionId_fieldKey: {
                            entityDefinitionId: ed.id,
                            fieldKey: row.fieldKey,
                        },
                    },
                });
                if (!def) {
                    throw new BadRequestException(`Unknown fieldKey: ${row.fieldKey}`);
                }
                await tx.formDefinitionItem.create({
                    data: {
                        formDefinitionId: form.id,
                        fieldDefinitionId: def.id,
                        sortOrder: row.sortOrder,
                        required: row.required ?? false,
                        visible: row.visible ?? true,
                        readOnly: row.readOnly ?? false,
                        sectionCode: row.sectionCode ?? null,
                    },
                });
            }
        });

        return { purpose, replaced: items.length };
    }
}
