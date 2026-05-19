import type { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

export type MjStatusDefaultRow = {
    code: string;
    name: string;
    description?: string;
};

export function loadMjStatusDefaults(): MjStatusDefaultRow[] {
    const path = join(__dirname, "mj-status-defaults.json");
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as MjStatusDefaultRow[];
}

/**
 * Идемпотентно создаёт/обновляет глобальные записи MjStatus из JSON (платформа + CRM).
 */
export async function ensureMjStatusDefaults(prisma: PrismaClient): Promise<number> {
    const rows = loadMjStatusDefaults();
    for (const row of rows) {
        await prisma.mjStatus.upsert({
            where: { code: row.code },
            create: {
                code: row.code,
                name: row.name,
                description: row.description ?? null,
                isActive: true,
            },
            update: {
                name: row.name,
                description: row.description ?? null,
                isActive: true,
            },
        });
    }
    return rows.length;
}
