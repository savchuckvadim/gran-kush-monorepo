import { ApiProperty } from "@nestjs/swagger";

export class UploadMemberFilesResponseDto {
    @ApiProperty({ example: true })
    queued: boolean;

    @ApiProperty({ example: "214" })
    jobId: string;
}
