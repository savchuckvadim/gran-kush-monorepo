import {
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    UnauthorizedException,
} from "@nestjs/common";

import * as bcrypt from "bcrypt";

import { LOGIN_FAILURES } from "@common/config/throttler/throttler.config";
import { hashSecretToken } from "@common/crypto/secret-token";

import { LoginFailureStore } from "../../domain/repositories/login-failure-store.interface";

/** Код 429 входа: слишком много неудач по этому адресу, подождать или войти иначе. */
export const TOO_MANY_LOGIN_FAILURES = "too_many_attempts";

const BCRYPT_ROUNDS = 10;
/**
 * Хеш, с которым сравнивается пароль, когда у адреса пароля нет: так вход на любой адрес занимает
 * одно время, и по времени ответа не узнать, зарегистрирован ли он (TASK-665).
 */
const TIMING_HASH = bcrypt.hashSync("password-sign-in:timing", BCRYPT_ROUNDS);

/**
 * Проверка пароля при входе в CRM и кабинет (TASK-667). Гарантии:
 * - ответ «неверные данные» одинаков и по времени одинаков для чужого, несуществующего адреса и
 *   неверного пароля;
 * - после `LOGIN_FAILURES.maxFailures` неудач по адресу за окно вход паролем закрыт (429), даже с
 *   верным паролем: подбор с разных IP упирается в адрес. Удачный вход сбрасывает счётчик.
 * Счётчик недоступен (Redis лежит) — вход не блокируется: лимит на IP остаётся.
 */
@Injectable()
export class PasswordSignInService {
    private readonly logger = new Logger(PasswordSignInService.name);

    constructor(private readonly failures: LoginFailureStore) {}

    async verify(email: string, password: string, passwordHash: string | null): Promise<void> {
        const key = hashSecretToken(email.trim().toLowerCase());
        if ((await this.safely(() => this.failures.count(key), 0)) >= LOGIN_FAILURES.maxFailures) {
            throw new HttpException(
                {
                    message: "Too many failed sign-in attempts, try again later",
                    code: TOO_MANY_LOGIN_FAILURES,
                },
                HttpStatus.TOO_MANY_REQUESTS
            );
        }
        const matches = await bcrypt.compare(password, passwordHash ?? TIMING_HASH);
        if (!matches || passwordHash === null) {
            await this.safely(() => this.failures.increment(key, LOGIN_FAILURES.windowSeconds), 0);
            throw new UnauthorizedException("Invalid credentials");
        }
        await this.safely(() => this.failures.clear(key), undefined);
    }

    private async safely<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
        try {
            return await operation();
        } catch (error: unknown) {
            this.logger.warn(
                `Login failure counter unavailable: ${error instanceof Error ? error.message : String(error)}`
            );
            return fallback;
        }
    }
}
