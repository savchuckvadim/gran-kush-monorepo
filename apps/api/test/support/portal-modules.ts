import type { PrismaService } from "../../src/common/prisma/prisma.service";

/**
 * Включить модуль клуба напрямую в базе — для наборов, которые проверяют сам модуль, а не его
 * подключение (подключение через API — `finance-organization.e2e-spec.ts`).
 */
export const enablePortalModule = async (
    prisma: PrismaService,
    portalId: string,
    code: "finance"
): Promise<void> => {
    await prisma.portalModule.createMany({ data: [{ portalId, code }], skipDuplicates: true });
};
