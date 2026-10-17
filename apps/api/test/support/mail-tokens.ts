import { hashSecretToken } from "../../src/common/crypto/secret-token";

type Picker = (args: unknown[]) => string;

/** Где в аргументах письма лежит токен ссылки. */
const TOKEN_ARG: Record<string, Picker> = {
    sendMemberEmailVerification: (args) => args[2] as string,
    sendEmployeeEmailVerification: (args) => args[2] as string,
    sendPasswordReset: (args) => args[2] as string,
    sendAccountSetup: (args) => (args[0] as { token: string }).token,
    sendMembershipConsent: (args) => (args[0] as { token: string }).token,
};

/**
 * Токены писем в БД лежат хешем (TASK-668), поэтому тест, как человек, берёт ссылку из письма.
 * Методы почты оборачиваются шпионами (у подменённой почты — её jest.fn): отправка идёт как
 * обычно, аргументы запоминаются. `fromHash` по значению из БД находит токен в отправленных письмах.
 */
export const mailTokens = (mail: object) => {
    const methods = mail as Record<string, (...args: unknown[]) => unknown>;
    const spies = Object.entries(TOKEN_ARG)
        .filter(([method]) => typeof methods[method] === "function")
        .map(([method, pick]) => {
            const fn = methods[method];
            const spy = jest.isMockFunction(fn) ? fn : jest.spyOn(methods, method);
            return { spy, pick };
        });

    const fromHash = (hash: string | null | undefined): string => {
        for (const { spy, pick } of spies) {
            for (const args of spy.mock.calls as unknown[][]) {
                const token = pick(args);
                if (hashSecretToken(token) === hash) return token;
            }
        }
        throw new Error(`no letter carries a token with hash ${String(hash)}`);
    };

    return { fromHash };
};
