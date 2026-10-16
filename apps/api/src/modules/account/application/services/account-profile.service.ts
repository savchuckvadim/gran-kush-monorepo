import { Injectable } from "@nestjs/common";

import { type AccountProfile, EMPTY_PROFILE } from "../../domain/account-profile";
import { AccountProfileRepository } from "../../domain/repositories/account-profile-repository.interface";

/** Профиль аккаунта: читает пустой, если его не заполняли; сохраняет целиком. */
@Injectable()
export class AccountProfileService {
    constructor(private readonly repository: AccountProfileRepository) {}

    async get(userId: string): Promise<AccountProfile> {
        return (await this.repository.find(userId)) ?? EMPTY_PROFILE;
    }

    async save(userId: string, profile: AccountProfile): Promise<AccountProfile> {
        return this.repository.save(userId, profile);
    }
}
