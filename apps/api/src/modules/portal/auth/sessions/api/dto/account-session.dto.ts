import { ApiProperty } from "@nestjs/swagger";

import {
    SESSION_AUDIENCES,
    type SessionAudience,
    type SignInMethod,
} from "../../domain/auth-session";

const SIGN_IN_METHODS: SignInMethod[] = [
    "password",
    "google",
    "telegram",
    "email_link",
    "invitation",
    "registration",
];

/** Устройство в «Вход и безопасность»: где и как вошли, когда были активны. */
export class AccountSessionDto {
    @ApiProperty({ format: "uuid" })
    id: string;

    @ApiProperty({ enum: Object.values(SESSION_AUDIENCES), description: "Приложение входа" })
    audience: SessionAudience;

    @ApiProperty({ enum: SIGN_IN_METHODS })
    signInMethod: SignInMethod;

    @ApiProperty({
        type: String,
        nullable: true,
        description: "User-Agent браузера или приложения",
    })
    userAgent: string | null;

    @ApiProperty({ type: String, nullable: true })
    ipAddress: string | null;

    @ApiProperty({ type: String, format: "date-time" })
    createdAt: string;

    @ApiProperty({ type: String, format: "date-time", description: "Последнее обновление токена" })
    lastUsedAt: string;

    @ApiProperty({ description: "Сессия этого запроса" })
    current: boolean;
}

export class AccountSessionsResponseDto {
    @ApiProperty({ type: () => [AccountSessionDto] })
    sessions: AccountSessionDto[];
}

export class EndedSessionsResponseDto {
    @ApiProperty({ description: "Сколько сессий закрыто" })
    ended: number;
}
