import type {
    AuthTokenPurpose,
    AuthTokenSubject,
    ConsumeAuthTokenResult,
} from "../domain/auth-token";
import {
    AuthTokenRepository,
    type IssueAuthTokenData,
} from "../domain/auth-token-repository.interface";

interface Row {
    purpose: AuthTokenPurpose;
    tokenHash: string;
    userId: string | null;
    email: string | null;
    payload: unknown;
    expiresAt: Date;
    consumedAt: Date | null;
}

const sameSubject = (row: Row, subject: AuthTokenSubject): boolean =>
    "userId" in subject
        ? row.userId === subject.userId
        : row.userId === null && row.email === subject.email;

/** Репозиторий ссылок в памяти — те же правила, что у Prisma-реализации, для юнит-тестов. */
export class InMemoryAuthTokenRepository extends AuthTokenRepository {
    readonly rows: Row[] = [];

    issue(data: IssueAuthTokenData): Promise<void> {
        const kept = this.rows.filter(
            (row) =>
                !(
                    row.purpose === data.purpose &&
                    row.consumedAt === null &&
                    sameSubject(row, data.subject)
                )
        );
        this.rows.splice(0, this.rows.length, ...kept, {
            purpose: data.purpose,
            tokenHash: data.tokenHash,
            userId: "userId" in data.subject ? data.subject.userId : null,
            email: "email" in data.subject ? data.subject.email : null,
            payload: data.payload ?? null,
            expiresAt: data.expiresAt,
            consumedAt: null,
        });
        return Promise.resolve();
    }

    consume(
        purposes: AuthTokenPurpose[],
        tokenHash: string,
        now: Date
    ): Promise<ConsumeAuthTokenResult> {
        const row = this.rows.find((candidate) => candidate.tokenHash === tokenHash);
        if (!row || !purposes.includes(row.purpose) || row.consumedAt) {
            return Promise.resolve({ kind: "invalid" });
        }
        if (row.expiresAt <= now) return Promise.resolve({ kind: "expired" });
        row.consumedAt = now;
        return Promise.resolve({
            kind: "consumed",
            token: {
                purpose: row.purpose,
                userId: row.userId,
                email: row.email,
                payload: row.payload,
            },
        });
    }

    revokeForUser(userId: string, purposes: AuthTokenPurpose[]): Promise<void> {
        const kept = this.rows.filter(
            (row) => !(row.userId === userId && purposes.includes(row.purpose) && !row.consumedAt)
        );
        this.rows.splice(0, this.rows.length, ...kept);
        return Promise.resolve();
    }

    deleteStale(now: Date, consumedBefore: Date): Promise<number> {
        const kept = this.rows.filter(
            (row) => row.expiresAt >= now && !(row.consumedAt && row.consumedAt < consumedBefore)
        );
        const removed = this.rows.length - kept.length;
        this.rows.splice(0, this.rows.length, ...kept);
        return Promise.resolve(removed);
    }
}
