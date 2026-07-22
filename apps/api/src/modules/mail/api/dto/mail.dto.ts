import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export enum EmailTemplate {
    CONFIRMATION = "signup-confirmation-email",
    FIRST_STEPS = "first-steps-email",
}

export class SendEmailRequestDto {
    @ApiProperty({ type: String, description: "Email", example: "test@example.com" })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ type: String,
        description: "Subject",
        example: "Welcome to the realm of NestJS",
    })
    @IsString()
    @IsNotEmpty()
    @IsString()
    subject: string;

    @ApiProperty({ type: String, description: "Template", example: "text" })
    @IsString()
    @IsNotEmpty()
    @IsString()
    body: string;

    @ApiProperty({ type: String, description: "Name", example: "John" })
    @IsString()
    @IsNotEmpty()
    @IsString()
    name: string;

    @ApiProperty({ type: String, description: "Surname", example: "Doe" })
    @IsString()
    @IsNotEmpty()
    @IsString()
    surname: string;
}

export class SendEmailOfferRequestDto {
    @ApiProperty({ type: String, description: "Email", example: "test@example.com" })
    @IsString()
    @IsNotEmpty()
    @IsEmail()
    email: string;
}
