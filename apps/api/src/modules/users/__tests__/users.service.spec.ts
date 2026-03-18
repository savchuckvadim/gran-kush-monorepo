import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { CreateUserDto } from "@users/api/dto/create-user.dto";
import { UpdateUserDto } from "@users/api/dto/update-user.dto";
import { UsersService } from "@users/application/services/users.service";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

// Mock bcrypt module
jest.mock("bcrypt", () => ({
    hash: jest.fn(),
}));

describe("UsersService", () => {
    let service: UsersService;

    const mockUser: User = {
        id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        passwordHash: "hashedPassword123",
        isActive: true,
        emailConfirmed: false,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    };

    const mockUserRepository = {
        existsByEmail: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        findByEmail: jest.fn(),
        findByEmailWithRelations: jest.fn(),
        findByEmailVerificationToken: jest.fn(),
        findByResetPasswordToken: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: UserRepository,
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);

        // Сброс всех моков
        jest.clearAllMocks();
        // Сброс моков репозитория
        Object.values(mockUserRepository).forEach((mock) => {
            if (jest.isMockFunction(mock)) {
                mock.mockReset();
            }
        });

        (bcrypt.hash as jest.Mock).mockReset();
    });

    describe("create", () => {
        const createDto: CreateUserDto = {
            email: "test@example.com",
            password: "password123",
        };

        it("should create a user successfully", async () => {
            mockUserRepository.existsByEmail.mockResolvedValue(false);
            mockUserRepository.create.mockResolvedValue(mockUser);

            (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword123");

            const result = await service.create(createDto);

            expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith(createDto.email);

            expect(bcrypt.hash).toHaveBeenCalledWith(createDto.password, 10);
            expect(mockUserRepository.create).toHaveBeenCalled();
            expect(result).toMatchObject({
                email: createDto.email.toLowerCase(),
                isActive: true,
            });
            expect(result.id).toBeDefined();
        });

        it("should throw ConflictException if user already exists", async () => {
            mockUserRepository.existsByEmail.mockResolvedValue(true);

            await expect(service.create(createDto)).rejects.toThrow(ConflictException);
            await expect(service.create(createDto)).rejects.toThrow(
                "User with this email already exists"
            );
            expect(mockUserRepository.create).not.toHaveBeenCalled();
        });

        it("should handle email in lowercase (decorator transforms it)", async () => {
            // В реальном приложении @IsEmailWithLowerCase декоратор приводит email к нижнему регистру
            // В unit-тестах декораторы не применяются, поэтому проверяем, что сервис работает с email в нижнем регистре
            const dtoWithLowercase: CreateUserDto = {
                ...createDto,
                email: "test@example.com", // уже в нижнем регистре (как после трансформации декоратором)
            };

            mockUserRepository.existsByEmail.mockResolvedValue(false);
            mockUserRepository.create.mockResolvedValue(mockUser);

            (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword123");

            const result = await service.create(dtoWithLowercase);

            expect(mockUserRepository.existsByEmail).toHaveBeenCalledWith("test@example.com");
            expect(result.email).toBe("test@example.com");
        });
    });

    describe("findById", () => {
        it("should return user by id", async () => {
            mockUserRepository.findById.mockResolvedValue(mockUser);

            const result = await service.findById(mockUser.id);

            expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
            expect(result).toMatchObject({
                id: mockUser.id,
                email: mockUser.email,
                isActive: mockUser.isActive,
            });
        });

        it("should throw NotFoundException if user not found", async () => {
            mockUserRepository.findById.mockResolvedValue(null);

            await expect(service.findById("invalid-id")).rejects.toThrow(NotFoundException);
            await expect(service.findById("invalid-id")).rejects.toThrow(
                "User with ID invalid-id not found"
            );
        });
    });

    describe("update", () => {
        const updateDto: UpdateUserDto = {
            password: "newPassword123",
            isActive: false,
        };

        const updatedUser: User = {
            ...mockUser,
            passwordHash: "hashedNewPassword",
            isActive: false,
        };

        it("should update user successfully", async () => {
            mockUserRepository.findById.mockResolvedValue(mockUser);
            mockUserRepository.update.mockResolvedValue(updatedUser);

            const result = await service.update(mockUser.id, updateDto);

            expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
            expect(mockUserRepository.update).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    passwordHash: expect.any(String),
                    isActive: updateDto.isActive,
                })
            );
            expect(result.isActive).toBe(updateDto.isActive);
        });

        it("should throw NotFoundException if user not found before update", async () => {
            mockUserRepository.findById.mockResolvedValue(null);
            mockUserRepository.update.mockResolvedValue(null);

            await expect(service.update("invalid-id", updateDto)).rejects.toThrow(
                NotFoundException
            );
            expect(mockUserRepository.findById).toHaveBeenCalledWith("invalid-id");
            expect(mockUserRepository.update).not.toHaveBeenCalled();
        });

        it("should throw NotFoundException if user not found after update", async () => {
            mockUserRepository.findById.mockResolvedValue(mockUser);
            mockUserRepository.update.mockResolvedValue(null);

            await expect(service.update(mockUser.id, updateDto)).rejects.toThrow(NotFoundException);
            expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
            expect(mockUserRepository.update).toHaveBeenCalled();
        });

        it("should update only provided fields", async () => {
            const partialDto: UpdateUserDto = {
                isActive: false,
            };

            const partiallyUpdatedUser: User = {
                ...mockUser,
                isActive: false,
            };

            mockUserRepository.findById
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(partiallyUpdatedUser);
            mockUserRepository.update.mockResolvedValue(partiallyUpdatedUser);

            const result = await service.update(mockUser.id, partialDto);

            expect(mockUserRepository.update).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    isActive: partialDto.isActive,
                })
            );
            expect(result.isActive).toBe(partialDto.isActive);
        });
    });

    describe("delete", () => {
        it("should delete user successfully", async () => {
            mockUserRepository.findById.mockResolvedValue(mockUser);
            mockUserRepository.delete.mockResolvedValue(undefined);

            await service.delete(mockUser.id);

            expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
            expect(mockUserRepository.delete).toHaveBeenCalledWith(mockUser.id);
        });

        it("should throw NotFoundException if user not found", async () => {
            mockUserRepository.findById.mockResolvedValue(null);

            await expect(service.delete("invalid-id")).rejects.toThrow(NotFoundException);
            expect(mockUserRepository.delete).not.toHaveBeenCalled();
        });
    });
});
