// Guards
export { AdminGuard } from "./infrastructure/guards/admin.guard";
export { EmployeeJwtAuthGuard } from "./infrastructure/guards/employee-jwt-auth.guard";
export { EmployeeJwtMobileAuthGuard } from "./infrastructure/guards/employee-jwt-mobile-auth.guard";
export { EmployeeLocalAuthGuard } from "./infrastructure/guards/employee-local-auth.guard";

// Re-export Admin decorator for convenience
export { Admin } from "@common/decorators/auth/admin.decorator";

// Decorators
export { CurrentEmployee } from "./api/decorators/current-employee.decorator";
export {
    RequireEmployeeAdmin,
    RequireEmployeeJwt,
    RequireEmployeeJwtMobile,
} from "./api/decorators/require-employee-jwt.decorator";

// Services
export { EmployeeAuthService } from "./application/services/employee-auth.service";
export { EmployeeRegistrationService } from "./application/services/employee-registration.service";

// DTOs
export { EmployeeAuthResponseDto } from "./api/dto/employee-auth-response.dto";
export { EmployeeLoginDto } from "./api/dto/employee-login.dto";
export { EmployeeLogoutResponseDto } from "./api/dto/employee-logout-response.dto";
export { EmployeeMeResponseDto } from "./api/dto/employee-me-response.dto";
export { EmployeeRefreshTokenResponseDto } from "./api/dto/employee-refresh-token-response.dto";
export { RegisterEmployeeDto } from "./api/dto/register-employee.dto";

// Module
export { EmployeeAuthModule } from "./employee-auth.module";
