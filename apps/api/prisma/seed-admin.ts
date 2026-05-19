import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

import { ensureMjStatusDefaults } from "../src/common/reference-data/mj-status.seed";

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
        process.env.PLATFORM_BOOTSTRAP_ENABLED ?? process.env.BOOTSTRAP_ADMIN_ENABLED,
        false
    );
    if (!isEnabled) {
        console.log(
            "[seed-admin] Skip: PLATFORM_BOOTSTRAP_ENABLED / BOOTSTRAP_ADMIN_ENABLED is false"
        );
        return;
    }

    const adminEmailRaw =
        process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim() || process.env.BOOTSTRAP_ADMIN_EMAIL?.trim();
    const adminPasswordRaw =
        process.env.PLATFORM_BOOTSTRAP_PASSWORD?.trim() ||
        process.env.BOOTSTRAP_ADMIN_PASSWORD?.trim();
    if (!adminEmailRaw) {
        throw new Error("Set PLATFORM_BOOTSTRAP_EMAIL or BOOTSTRAP_ADMIN_EMAIL");
    }
    if (!adminPasswordRaw) {
        throw new Error("Set PLATFORM_BOOTSTRAP_PASSWORD or BOOTSTRAP_ADMIN_PASSWORD");
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
            portalId: null,
            ...(shouldForcePasswordReset ? { passwordHash } : {}),
        },
        create: {
            email: adminEmail.toLowerCase(),
            passwordHash,
            isActive: true,
            emailConfirmed: true,
            portalId: null,
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
    const n = await ensureMjStatusDefaults(prisma);
    console.log(`[seed-admin] MJ reference statuses ensured (${n} rows)`);
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
