import { Injectable } from "@nestjs/common";

import type { AccountProfile as AccountProfileRow } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import type { AccountProfile } from "../../domain/account-profile";
import { AccountProfileRepository } from "../../domain/repositories/account-profile-repository.interface";

const toProfile = (row: AccountProfileRow): AccountProfile => ({
    firstName: row.firstName,
    lastName: row.lastName,
    birthday: row.birthday ? row.birthday.toISOString().slice(0, 10) : null,
    phone: row.phone,
    address: row.address,
});

const toColumns = (profile: AccountProfile) => ({
    ...profile,
    // DATE без времени: полночь UTC хранит именно этот день
    birthday: profile.birthday ? new Date(`${profile.birthday}T00:00:00.000Z`) : null,
});

@Injectable()
export class AccountProfilePrismaRepository implements AccountProfileRepository {
    constructor(private readonly prisma: PrismaService) {}

    async find(userId: string): Promise<AccountProfile | null> {
        const row = await this.prisma.accountProfile.findUnique({ where: { userId } });
        return row ? toProfile(row) : null;
    }

    async save(userId: string, profile: AccountProfile): Promise<AccountProfile> {
        const data = toColumns(profile);
        const row = await this.prisma.accountProfile.upsert({
            where: { userId },
            create: { userId, ...data },
            update: data,
        });
        return toProfile(row);
    }
}
