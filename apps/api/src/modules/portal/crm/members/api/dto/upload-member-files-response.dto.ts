import { ApiProperty } from "@nestjs/swagger";

export class UploadMemberFilesResponseDto {
    @ApiProperty({ type: Boolean, example: true })
    queued: boolean;

    @ApiProperty({ type: String, example: "214" })
    jobId: string;
}
