import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { AuthService } from "@auth/application/services/auth.service";
import { UsersService } from "@users/application/services/users.service";
import { User } from "@users/domain/entity/user.entity";
import * as bcrypt from "bcrypt";

// Mock bcrypt module
jest.mock("bcrypt", () => ({
    compare: jest.fn(),
}));

describe("AuthService", () => {
    let service: AuthService;
    let mockUsersService: jest.Mocked<UsersService>;
    let mockJwtService: jest.Mocked<JwtService>;
    let mockConfigService: jest.Mocked<ConfigService>;

    const mockUser = new User({
        id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        name: "Test User",
        phone: "+1234567890",
        passwordHash: "hashedPassword",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: {
                        create: jest.fn(),
                        findByEmailForAuth: jest.fn(),
                        findById: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        signAsync: jest.fn(),
                        verifyAsync: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        mockUsersService = module.get(UsersService);
        mockJwtService = module.get(JwtService);
        mockConfigService = module.get(ConfigService);

        jest.clearAllMocks();
    });

    describe("register", () => {
        const registerDto = {
            email: "test@example.com",
            password: "password123",
            name: "Test User",
            phone: "+1234567890",
        };

        it("should register a new user and return tokens", async () => {
            mockUsersService.create = jest.fn().mockResolvedValue(undefined);
            mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === "JWT_SECRET") return "secret";
                if (key === "JWT_ACCESS_TOKEN_EXPIRES_IN") return "15m";
                if (key === "JWT_REFRESH_TOKEN_EXPIRES_IN") return "7d";
                return undefined;
            });
            mockJwtService.signAsync = jest
                .fn()
                .mockResolvedValueOnce("accessToken")
                .mockResolvedValueOnce("refreshToken");

            const result = await service.register(registerDto);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            const createSpy = mockUsersService.create;
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const findByEmailSpy = mockUsersService.findByEmailForAuth;
            expect(createSpy).toHaveBeenCalledWith(registerDto);
            expect(findByEmailSpy).toHaveBeenCalledWith(registerDto.email);
            expect(result).toEqual({
                accessToken: "accessToken",
                refreshToken: "refreshToken",
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    name: mockUser.name,
                    phone: mockUser.phone,
                },
            });
        });

        it("should throw ConflictException if user creation fails", async () => {
            mockUsersService.create = jest.fn().mockResolvedValue(undefined);
            mockUsersService.findByEmailForAuth.mockResolvedValue(null);

            await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
            await expect(service.register(registerDto)).rejects.toThrow("Failed to create user");
        });

        it("should throw ConflictException if user already exists", async () => {
            mockUsersService.create.mockRejectedValue(new ConflictException("User already exists"));

            await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
        });
    });

    describe("login", () => {
        const loginDto = {
            email: "test@example.com",
            password: "password123",
        };

        it("should login user and return tokens", async () => {
            mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);

            const mockBcryptCompare = bcrypt.compare as jest.Mock;
            mockBcryptCompare.mockResolvedValue(true);
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === "JWT_SECRET") return "secret";
                if (key === "JWT_ACCESS_TOKEN_EXPIRES_IN") return "15m";
                if (key === "JWT_REFRESH_TOKEN_EXPIRES_IN") return "7d";
                return undefined;
            });
            mockJwtService.signAsync = jest
                .fn()
                .mockResolvedValueOnce("accessToken")
                .mockResolvedValueOnce("refreshToken");

            const result = await service.login(loginDto);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            const findByEmailSpy = mockUsersService.findByEmailForAuth;
            expect(findByEmailSpy).toHaveBeenCalledWith(loginDto.email);
            expect(result).toEqual({
                accessToken: "accessToken",
                refreshToken: "refreshToken",
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    name: mockUser.name,
                    phone: mockUser.phone,
                },
            });
        });

        it("should throw UnauthorizedException if user not found", async () => {
            mockUsersService.findByEmailForAuth.mockResolvedValue(null);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
            await expect(service.login(loginDto)).rejects.toThrow("Invalid credentials");
        });

        it("should throw UnauthorizedException if user is inactive", async () => {
            const inactiveUser = new User({
                ...mockUser,
                isActive: false,
            });
            mockUsersService.findByEmailForAuth.mockResolvedValue(inactiveUser);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
            await expect(service.login(loginDto)).rejects.toThrow("User is inactive");
        });

        it("should throw UnauthorizedException if password is invalid", async () => {
            mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);

            const mockBcryptCompare = bcrypt.compare as jest.Mock;
            mockBcryptCompare.mockResolvedValue(false);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
            await expect(service.login(loginDto)).rejects.toThrow("Invalid credentials");
        });
    });

    describe("validateUser", () => {
        const email = "test@example.com";
        const password = "password123";

        it("should return user if credentials are valid", async () => {
            mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);

            const mockBcryptCompare = bcrypt.compare as jest.Mock;
            mockBcryptCompare.mockResolvedValue(true);

            const result = await service.validateUser(email, password);

            expect(result).toEqual(mockUser);
        });

        it("should return null if user not found", async () => {
            mockUsersService.findByEmailForAuth.mockResolvedValue(null);

            const result = await service.validateUser(email, password);

            expect(result).toBeNull();
        });

        it("should return null if password is invalid", async () => {
            mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);

            const mockBcryptCompare = bcrypt.compare as jest.Mock;
            mockBcryptCompare.mockResolvedValue(false);

            const result = await service.validateUser(email, password);

            expect(result).toBeNull();
        });

        it("should return null if user is inactive", async () => {
            const inactiveUser = new User({
                ...mockUser,
                isActive: false,
            });
            mockUsersService.findByEmailForAuth.mockResolvedValue(inactiveUser);

            const mockBcryptCompare = bcrypt.compare as jest.Mock;
            mockBcryptCompare.mockResolvedValue(true);

            const result = await service.validateUser(email, password);

            expect(result).toBeNull();
        });
    });

    describe("validateJwtPayload", () => {
        const payload = {
            sub: "507f1f77bcf86cd799439011",
            email: "test@example.com",
            name: "Test User",
        };

        it("should return user if payload is valid", async () => {
            mockUsersService.findByEmailForAuth.mockResolvedValue(mockUser);

            const result = await service.validateJwtPayload(payload);

            expect(result).toEqual(mockUser);
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const findByEmailSpy = mockUsersService.findByEmailForAuth;
            expect(findByEmailSpy).toHaveBeenCalledWith(payload.email);
        });

        it("should return null if user not found", async () => {
            mockUsersService.findByEmailForAuth.mockResolvedValue(null);

            const result = await service.validateJwtPayload(payload);

            expect(result).toBeNull();
        });

        it("should return null if user is inactive", async () => {
            const inactiveUser = new User({
                ...mockUser,
                isActive: false,
            });
            mockUsersService.findByEmailForAuth.mockResolvedValue(inactiveUser);

            const result = await service.validateJwtPayload(payload);

            expect(result).toBeNull();
        });

        it("should return null if error occurs", async () => {
            mockUsersService.findByEmailForAuth.mockRejectedValue(new Error("Database error"));

            const result = await service.validateJwtPayload(payload);

            expect(result).toBeNull();
        });
    });

    describe("refreshToken", () => {
        const refreshToken = "validRefreshToken";
        const payload = {
            sub: "507f1f77bcf86cd799439011",
            email: "test@example.com",
            name: "Test User",
        };

        it("should refresh access token", async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === "JWT_REFRESH_SECRET") return "refreshSecret";
                if (key === "JWT_SECRET") return "secret";
                if (key === "JWT_ACCESS_TOKEN_EXPIRES_IN") return "15m";
                return undefined;
            });
            mockJwtService.verifyAsync = jest.fn().mockResolvedValue(payload);
            mockUsersService.findById = jest.fn().mockResolvedValue(mockUser);
            mockJwtService.signAsync = jest.fn().mockResolvedValue("newAccessToken");

            const result = await service.refreshToken(refreshToken);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            const verifyAsyncSpy = mockJwtService.verifyAsync;
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const findByIdSpy = mockUsersService.findById;
            expect(verifyAsyncSpy).toHaveBeenCalledWith(refreshToken, {
                secret: "refreshSecret",
            });
            expect(findByIdSpy).toHaveBeenCalledWith(payload.sub);
            expect(result).toEqual({ accessToken: "newAccessToken" });
        });

        it("should use JWT_SECRET if JWT_REFRESH_SECRET is not set", async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === "JWT_SECRET") return "secret";
                if (key === "JWT_ACCESS_TOKEN_EXPIRES_IN") return "15m";
                return undefined;
            });
            mockJwtService.verifyAsync = jest.fn().mockResolvedValue(payload);
            mockUsersService.findById = jest.fn().mockResolvedValue(mockUser);
            mockJwtService.signAsync = jest.fn().mockResolvedValue("newAccessToken");

            await service.refreshToken(refreshToken);

            // eslint-disable-next-line @typescript-eslint/unbound-method
            const verifyAsyncSpy = mockJwtService.verifyAsync;
            expect(verifyAsyncSpy).toHaveBeenCalledWith(refreshToken, {
                secret: "secret",
            });
        });

        it("should throw UnauthorizedException if refresh token is invalid", async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === "JWT_REFRESH_SECRET") return "refreshSecret";
                return undefined;
            });
            mockJwtService.verifyAsync.mockRejectedValue(new Error("Invalid token"));

            await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
            await expect(service.refreshToken(refreshToken)).rejects.toThrow(
                "Invalid refresh token"
            );
        });

        it("should throw UnauthorizedException if user not found", async () => {
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === "JWT_REFRESH_SECRET") return "refreshSecret";
                return undefined;
            });
            mockJwtService.verifyAsync.mockResolvedValue(payload);
            mockUsersService.findById = jest.fn().mockResolvedValue(null);

            await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
        });

        it("should throw UnauthorizedException if user is inactive", async () => {
            const inactiveUser = new User({
                ...mockUser,
                isActive: false,
            });
            mockConfigService.get.mockImplementation((key: string) => {
                if (key === "JWT_REFRESH_SECRET") return "refreshSecret";
                return undefined;
            });
            mockJwtService.verifyAsync.mockResolvedValue(payload);
            mockUsersService.findById.mockResolvedValue(inactiveUser);

            await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
        });
    });
});
