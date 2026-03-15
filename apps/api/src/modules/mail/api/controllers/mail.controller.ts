import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse } from "@nestjs/swagger";

import { MailService } from "../../application/services/mail.service";
import { SendEmailRequestDto } from "../dto/mail.dto";

@Controller("mail")
export class MailController {
    constructor(private readonly mailService: MailService) {}

    @ApiOperation({ summary: "Send email" })
    @ApiBody({ type: SendEmailRequestDto })
    @ApiResponse({
        status: 200,
        description: "Email sent",
        type: Boolean,
    })
    @Post("send")
    async sendMail(@Body() dto: SendEmailRequestDto) {
        return await this.mailService.sendEmail({
            subject: dto.subject,
            html: dto.body,
            to: [dto.email],
            context: {
                name: dto.name,
            },
        });
    }
}
