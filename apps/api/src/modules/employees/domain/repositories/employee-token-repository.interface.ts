export abstract class EmployeeTokenRepository {
    abstract create(data: {
        token: string;
        employeeId: string;
        portalId?: string;
        expiresAt: Date;
    }): Promise<any>;
    abstract findByToken(token: string): Promise<any>;
    abstract findByEmployeeId(employeeId: string): Promise<any[]>;
    abstract deleteByToken(token: string): Promise<any>;
    abstract deleteByEmployeeId(employeeId: string): Promise<any>;
    abstract deleteExpired(): Promise<any>;
}
