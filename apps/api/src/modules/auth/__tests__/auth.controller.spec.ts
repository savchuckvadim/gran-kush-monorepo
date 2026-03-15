import { Test, TestingModule } from "@nestjs/testing";

import { AuthController } from "@auth/api/controllers/auth.controller";
import { AuthService } from "@auth/application/services/auth.service";
import { User } from "@users/domain/entity/user.entity";

describe("AuthController", () => {
    let controller: AuthController;
    let mockAuthService: jest.Mocked<AuthService>;

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

    const mockAuthResponse = {
        accessToken: "accessToken",
        refreshToken: "refreshToken",
        user: {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            phone: mockUser.phone,
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        register: jest.fn(),
                        login: jest.fn(),
                        refreshToken: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        mockAuthService = module.get(AuthService);

        jest.clearAllMocks();
    });

    describe("register", () => {
        const registerDto = {
            email: "test@example.com",
            password: "password123",
            name: "Test User",
            phone: "+1234567890",
        };

        it("should register a new user", async () => {
            mockAuthService.register = jest.fn().mockResolvedValue(mockAuthResponse);

            const result = await controller.register(registerDto);

            const registerSpy = mockAuthService.register;
            expect(registerSpy).toHaveBeenCalledWith(registerDto);
            expect(result).toEqual(mockAuthResponse);
        });
    });

    describe("login", () => {
        const loginDto = {
            email: "test@example.com",
            password: "password123",
        };

        it("should login user", async () => {
            mockAuthService.login = jest.fn().mockResolvedValue(mockAuthResponse);

            const result = await controller.login(loginDto, mockUser);

            const loginSpy = mockAuthService.login;
            expect(loginSpy).toHaveBeenCalledWith(loginDto);
            expect(result).toEqual(mockAuthResponse);
        });
    });

    describe("refresh", () => {
        const refreshTokenDto = {
            refreshToken: "validRefreshToken",
        };

        it("should refresh access token", async () => {
            const refreshResponse = { accessToken: "newAccessToken" };
            mockAuthService.refreshToken = jest.fn().mockResolvedValue(refreshResponse);

            const result = await controller.refresh(refreshTokenDto);

            const refreshTokenSpy = mockAuthService.refreshToken;
            expect(refreshTokenSpy).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
            expect(result).toEqual(refreshResponse);
        });
    });

    describe("getMe", () => {
        it("should return current user information", () => {
            const result = controller.getMe(mockUser);

            expect(result).toEqual({
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
                phone: mockUser.phone,
                isActive: mockUser.isActive,
                createdAt: mockUser.createdAt,
                updatedAt: mockUser.updatedAt,
            });
        });
    });
});
