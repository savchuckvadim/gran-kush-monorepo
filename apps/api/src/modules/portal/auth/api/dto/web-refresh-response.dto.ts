import { ApiProperty } from "@nestjs/swagger";

/** Веб-refresh: новая пара уходит только в HttpOnly-куки, в теле токенов нет (TASK-668). */
export class WebRefreshResponseDto {
    @ApiProperty({ type: Boolean, example: true })
    refreshed: boolean;
}
