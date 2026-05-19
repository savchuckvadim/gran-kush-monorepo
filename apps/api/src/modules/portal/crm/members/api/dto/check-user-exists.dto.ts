import { ApiProperty } from "@nestjs/swagger";

export class CheckUserExistsDto {
    @ApiProperty({ example: "user@example.com" })
    email: string;
}
