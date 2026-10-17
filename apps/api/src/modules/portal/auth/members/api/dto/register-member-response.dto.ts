import { ApiProperty } from "@nestjs/swagger";

/** Один ответ на новый и занятый адрес (TASK-665): ни id аккаунта, ни членства в нём нет. */
export class RegisterMemberResponseDto {
    @ApiProperty({ example: "user@example.com", type: String })
    email: string;

    @ApiProperty({
        example: true,
        type: Boolean,
        description: "Сессии нет: войти можно после подтверждения почты по ссылке из письма",
    })
    awaitingEmailConfirmation: boolean;
}
