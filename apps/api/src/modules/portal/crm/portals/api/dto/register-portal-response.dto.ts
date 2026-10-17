import { ApiProperty, OmitType } from "@nestjs/swagger";

class RegisteredPortalDto {
    @ApiProperty({ example: "f5f0c2f1-c877-4f13-8b6a-5b5b7c8f9c1f", type: String })
    id: string;

    @ApiProperty({ example: "green-club", type: String })
    name: string;

    @ApiProperty({ example: "Green Club", type: String })
    displayName: string;

    @ApiProperty({ example: "active", type: String })
    status: string;
}

class PortalOwnerInfoDto {
    @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", type: String })
    id: string;

    @ApiProperty({ example: "owner@example.com", type: String })
    email: string;

    @ApiProperty({ example: "John", type: String })
    name: string;

    @ApiProperty({ example: "owner", type: String, description: "Ключ роли клуба" })
    role: string;
}

export class RegisterPortalResponseDto {
    @ApiProperty({ type: () => RegisteredPortalDto })
    portal: RegisteredPortalDto;

    @ApiProperty({ type: () => PortalOwnerInfoDto })
    owner: PortalOwnerInfoDto;

    @ApiProperty({
        type: String,
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "Устройство новой сессии; токены выставлены в HttpOnly-куки",
    })
    deviceId: string;
}

/** Ещё один клуб того же аккаунта: сессия не меняется. */
export class CreatedClubResponseDto extends OmitType(RegisterPortalResponseDto, [
    "deviceId",
] as const) {}
