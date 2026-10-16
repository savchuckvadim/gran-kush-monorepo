import type { AccountProfile } from "../account-profile";

export abstract class AccountProfileRepository {
    /** Профиль аккаунта; `null`, если человек его ещё не заполнял. */
    abstract find(userId: string): Promise<AccountProfile | null>;

    abstract save(userId: string, profile: AccountProfile): Promise<AccountProfile>;
}
