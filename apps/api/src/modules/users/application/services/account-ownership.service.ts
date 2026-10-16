import { Injectable, UnauthorizedException } from "@nestjs/common";

import { UserAccountStatus } from "@prisma/client";
import { User } from "@users/domain/entity/user.entity";
import * as bcrypt from "bcrypt";

/**
 * Чем человек доказывает, что аккаунт его. Клуб знает про аккаунт только email, поэтому
 * его слова ничего не доказывают: любое действие за владельца (согласие на членство,
 * приглашение сотрудника, показ документов) требует одного из доказательств ниже.
 */
export type OwnerProof =
    /** Пароль аккаунта (только если он у аккаунта есть). */
    | { kind: "password"; password: string | undefined }
    /** Сессия самого аккаунта с подтверждённой почтой. */
    | { kind: "session"; userId: string }
    /**
     * Одноразовый токен из письма на адрес аккаунта. Токен проверил вызывающий:
     * он же и связал его с этим аккаунтом. Достаточен, только если пароля у аккаунта нет.
     */
    | { kind: "mailbox_token" };

/** Поля аккаунта, нужные для проверки; подходят и сущность `User`, и строка Prisma. */
export type OwnerSubject = Pick<
    User,
    "id" | "status" | "passwordHash" | "emailConfirmed" | "isActive"
>;

/** Какое доказательство вообще возможно у аккаунта. */
export type ProofMethod = "password" | "mailbox";

/**
 * Единое правило «у аккаунта есть владелец».
 *
 * `pending_claim` — аккаунт завёл клуб по email, владелец ещё не пришёл. Всё остальное
 * (пароль, вход через Google, подтверждённая ссылка из письма) — аккаунт заявлен.
 * Пароль для этого не обязателен: у аккаунта с одним Google его нет, но владелец есть.
 * Проверка `passwordHash !== null` вместо этого пускала клуб к чужому аккаунту без согласия.
 */
@Injectable()
export class AccountOwnershipService {
    isClaimed(user: Pick<User, "status">): boolean {
        return user.status !== UserAccountStatus.pending_claim;
    }

    hasPassword(user: Pick<User, "passwordHash">): boolean {
        return user.passwordHash !== null;
    }

    /**
     * Пароль есть — владельца проверяем им. Нет (pending_claim или только Google) —
     * остаётся почтовый ящик: ссылка из письма доказывает доступ к адресу так же,
     * как сброс пароля.
     */
    proofMethod(user: Pick<User, "passwordHash">): ProofMethod {
        return this.hasPassword(user) ? "password" : "mailbox";
    }

    /** Бросает 401, если доказательство не подходит этому аккаунту. */
    async assertOwnerProof(user: OwnerSubject, proof: OwnerProof): Promise<void> {
        if (user.status === UserAccountStatus.blocked) {
            throw new UnauthorizedException("Account is blocked");
        }

        switch (proof.kind) {
            case "password": {
                const matches =
                    user.passwordHash && proof.password
                        ? await bcrypt.compare(proof.password, user.passwordHash)
                        : false;
                if (!matches) {
                    throw new UnauthorizedException("Invalid password for this account");
                }
                return;
            }
            case "session": {
                if (proof.userId !== user.id || !user.emailConfirmed || !user.isActive) {
                    throw new UnauthorizedException("Session does not prove ownership");
                }
                return;
            }
            case "mailbox_token": {
                // Если у аккаунта есть пароль, одного токена мало: письмо могли прочитать
                // посторонние, а пароль знает только владелец.
                if (this.hasPassword(user)) {
                    throw new UnauthorizedException("Password is required for this account");
                }
                return;
            }
        }
    }
}
