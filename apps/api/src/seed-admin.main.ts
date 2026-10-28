/**
 * Platform admin and global entity templates. Built with the API so the image runs it without
 * ts-node: `node dist/seed-admin.main` when the container starts with RUN_SEED=true; locally
 * `pnpm --filter api prisma:seed:admin`.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

import { ensureGlobalEntityTemplates } from "./common/reference-data/global-templates.seed";
import { syncSystemLabelTranslations } from "./common/reference-data/system-label-translations.sync";

import "dotenv/config";

function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
        throw new Error(`Missing required env variable: ${name}`);
    }

    return value.trim();
}

const adapter = new PrismaPg({
    connectionString: getRequiredEnv("DATABASE_URL"),
});

const prisma = new PrismaClient({ adapter });

function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
}

async function seedPlatformBootstrapAdmin(): Promise<void> {
    const isEnabled = parseBooleanFlag(
        process.env.PLATFORM_BOOTSTRAP_ENABLED ??
            process.env.PLATFORM_BOOTSTRAP_ADMIN_ENABLED ??
            process.env.BOOTSTRAP_ADMIN_ENABLED,
        false
    );
    if (!isEnabled) {
        console.log(
            "[seed-admin] Skip: PLATFORM_BOOTSTRAP_ADMIN_ENABLED / BOOTSTRAP_ADMIN_ENABLED is false"
        );
        return;
    }

    const adminEmailRaw =
        process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim() ||
        process.env.PLATFORM_BOOTSTRAP_ADMIN_EMAIL?.trim() ||
        process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
    const adminPasswordRaw =
        process.env.PLATFORM_BOOTSTRAP_PASSWORD?.trim() ||
        process.env.PLATFORM_BOOTSTRAP_ADMIN_PASSWORD?.trim() ||
        process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
    if (!adminEmailRaw) {
        throw new Error("Set PLATFORM_BOOTSTRAP_ADMIN_EMAIL or BOOTSTRAP_ADMIN_EMAIL");
    }
    if (!adminPasswordRaw) {
        throw new Error("Set PLATFORM_BOOTSTRAP_ADMIN_PASSWORD or BOOTSTRAP_ADMIN_PASSWORD");
    }
    const adminEmail = adminEmailRaw;
    const adminPassword = adminPasswordRaw;

    const shouldForcePasswordReset = parseBooleanFlag(
        process.env.PLATFORM_BOOTSTRAP_FORCE_PASSWORD_RESET ??
            process.env.BOOTSTRAP_ADMIN_FORCE_PASSWORD_RESET,
        false
    );

    const passwordHash = await hash(adminPassword, 10);

    const user = await prisma.user.upsert({
        where: { email: adminEmail.toLowerCase() },
        update: {
            isActive: true,
            ...(shouldForcePasswordReset ? { passwordHash } : {}),
        },
        create: {
            email: adminEmail.toLowerCase(),
            passwordHash,
            isActive: true,
            emailConfirmed: true,
        },
    });

    await prisma.platformAdmin.upsert({
        where: { userId: user.id },
        update: {
            role: "superadmin",
            isActive: true,
        },
        create: {
            userId: user.id,
            role: "superadmin",
            isActive: true,
        },
    });

    console.log(`[seed-admin] Platform admin upserted: ${adminEmail} (User ${user.id})`);
}

async function run(): Promise<void> {
    await seedPlatformBootstrapAdmin();
    await ensureGlobalEntityTemplates(prisma);
    const filled = await syncSystemLabelTranslations(prisma);
    console.log(
        `[seed-admin] Global entity templates ensured, label translations filled: ${JSON.stringify(filled)}`
    );
}

void run()
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[seed-admin] Failed: ${message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
