import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CheckUserExistsResponseDto {
    @ApiProperty({ example: true, type: Boolean })
    exists: boolean;

    @ApiProperty({
        example: true,
        type: Boolean,
        description: "false для pending_claim аккаунтов (пароль ещё не установлен)",
    })
    hasPassword: boolean;

    @ApiProperty({
        example: 1,
        type: Number,
        description: "Количество membership-мостов (порталов, где user является member)",
    })
    memberships: number;

    @ApiProperty({
        example: 0,
        type: Number,
        description: "Количество порталов, где user является employee",
    })
    employments: number;

    @ApiPropertyOptional({ type: String })
    message?: string;
}
