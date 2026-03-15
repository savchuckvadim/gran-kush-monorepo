export * from "./api/dto/auth-response.dto";
export * from "./api/dto/login.dto";
export * from "./api/dto/refresh-token.dto";
export * from "./api/dto/register.dto";
export * from "./auth.module";
export * from "./domain/interfaces/jwt-payload.interface";

// Note: JWT and Local strategies have been moved to employees and members modules
// Use EmployeeJwtStrategy/MemberJwtStrategy and EmployeeLocalStrategy/MemberLocalStrategy instead
// Old guards are kept for backward compatibility but require specific strategies from employees/members modules
export * from "./infrastructure/guards/jwt-auth.guard";
export * from "./infrastructure/guards/local-auth.guard";
