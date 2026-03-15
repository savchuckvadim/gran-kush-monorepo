import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcrypt";

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

async function seedBootstrapAdmin(): Promise<void> {
    const isBootstrapEnabled = parseBooleanFlag(process.env.BOOTSTRAP_ADMIN_ENABLED, false);
    if (!isBootstrapEnabled) {
        console.log("[seed-admin] Skip: BOOTSTRAP_ADMIN_ENABLED is false");
        return;
    }

    const adminEmail = getRequiredEnv("BOOTSTRAP_ADMIN_EMAIL");
    const adminPassword = getRequiredEnv("BOOTSTRAP_ADMIN_PASSWORD");
    const adminName = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Root";
    const adminSurname = process.env.BOOTSTRAP_ADMIN_SURNAME?.trim() || null;
    const adminPhone = process.env.BOOTSTRAP_ADMIN_PHONE?.trim() || null;
    const adminPosition = process.env.BOOTSTRAP_ADMIN_POSITION?.trim() || "Owner";
    const adminDepartment = process.env.BOOTSTRAP_ADMIN_DEPARTMENT?.trim() || "Administration";

    const shouldForcePasswordReset = parseBooleanFlag(
        process.env.BOOTSTRAP_ADMIN_FORCE_PASSWORD_RESET,
        false
    );

    const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail },
        select: { id: true, email: true },
    });

    const passwordHash = await hash(adminPassword, 10);

    const user = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
            isActive: true,
            ...(shouldForcePasswordReset ? { passwordHash } : {}),
        },
        create: {
            email: adminEmail,
            passwordHash,
            isActive: true,
        },
    });

    const existingEmployee = await prisma.employee.findUnique({
        where: { userId: user.id },
        select: { id: true, role: true },
    });

    await prisma.employee.upsert({
        where: { userId: user.id },
        update: {
            name: adminName,
            surname: adminSurname,
            phone: adminPhone,
            role: "admin",
            position: adminPosition,
            department: adminDepartment,
            isActive: true,
        },
        create: {
            userId: user.id,
            name: adminName,
            surname: adminSurname,
            phone: adminPhone,
            role: "admin",
            position: adminPosition,
            department: adminDepartment,
            isActive: true,
        },
    });

    const userAction = existingUser ? "updated" : "created";
    const employeeAction = existingEmployee ? "updated" : "created";
    console.log(
        `[seed-admin] Bootstrap admin ${userAction}/${employeeAction}: ${adminEmail} (role=admin)`
    );
}

void seedBootstrapAdmin()
    .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[seed-admin] Failed: ${message}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
