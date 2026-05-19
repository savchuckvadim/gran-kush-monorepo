export abstract class EmployeeTokenRepository {
    abstract create(data: {
        token: string;
        employeeId: string;
        deviceId: string;
        portalId?: string;
        expiresAt: Date;
    }): Promise<{ id: string }>;

    abstract findActiveByToken(token: string): Promise<{
        id: string;
        token: string;
        employeeId: string;
        deviceId: string;
        portalId: string | null;
        revoked: boolean;
        expiresAt: Date;
        employee: {
            id: string;
            isActive: boolean;
            portalId: string | null;
            user: { email: string };
        };
    } | null>;

    abstract revokeById(id: string): Promise<void>;

    abstract revokeAllActiveForEmployeeDevice(employeeId: string, deviceId: string): Promise<void>;

    abstract deleteByToken(token: string): Promise<{ count: number }>;

    abstract deleteByEmployeeId(employeeId: string): Promise<{ count: number }>;

    abstract deleteExpired(): Promise<{ count: number }>;
}
