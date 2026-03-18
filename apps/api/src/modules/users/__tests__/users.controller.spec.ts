import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { UsersController } from "@users/api/controllers/users.controller";
import { CreateUserDto } from "@users/api/dto/create-user.dto";
import { UpdateUserDto } from "@users/api/dto/update-user.dto";
import { UserResponseDto } from "@users/api/dto/user-response.dto";
import { UsersService } from "@users/application/services/users.service";

describe("UsersController", () => {
    let controller: UsersController;

    const mockUserResponse: UserResponseDto = {
        id: "507f1f77bcf86cd799439011",
        email: "test@example.com",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    };

    const mockUsersService = {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
            ],
        }).compile();

        controller = module.get<UsersController>(UsersController);

        jest.clearAllMocks();
    });

    describe("create", () => {
        const createDto: CreateUserDto = {
            email: "test@example.com",
            password: "password123",
        };

        it("should create a user", async () => {
            mockUsersService.create.mockResolvedValue(mockUserResponse);

            const result = await controller.create(createDto);

            expect(mockUsersService.create).toHaveBeenCalledWith(createDto);
            expect(result).toEqual(mockUserResponse);
        });

        it("should throw ConflictException if user exists", async () => {
            mockUsersService.create.mockRejectedValue(
                new ConflictException("User with this email already exists")
            );

            await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
            expect(mockUsersService.create).toHaveBeenCalledWith(createDto);
        });
    });

    describe("findOne", () => {
        const userId = "507f1f77bcf86cd799439011";

        it("should return user by id", async () => {
            mockUsersService.findById.mockResolvedValue(mockUserResponse);

            const result = await controller.findOne(userId);

            expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
            expect(result).toEqual(mockUserResponse);
        });

        it("should throw NotFoundException if user not found", async () => {
            mockUsersService.findById.mockRejectedValue(
                new NotFoundException(`User with ID ${userId} not found`)
            );

            await expect(controller.findOne(userId)).rejects.toThrow(NotFoundException);
            expect(mockUsersService.findById).toHaveBeenCalledWith(userId);
        });
    });

    describe("update", () => {
        const userId = "507f1f77bcf86cd799439011";
        const updateDto: UpdateUserDto = {
            password: "newPassword123",
            isActive: false,
        };

        const updatedUser: UserResponseDto = {
            ...mockUserResponse,
            ...updateDto,
        };

        it("should update user", async () => {
            mockUsersService.update.mockResolvedValue(updatedUser);

            const result = await controller.update(userId, updateDto);

            expect(mockUsersService.update).toHaveBeenCalledWith(userId, updateDto);
            expect(result).toEqual(updatedUser);
        });

        it("should throw NotFoundException if user not found", async () => {
            mockUsersService.update.mockRejectedValue(
                new NotFoundException(`User with ID ${userId} not found`)
            );

            await expect(controller.update(userId, updateDto)).rejects.toThrow(NotFoundException);
            expect(mockUsersService.update).toHaveBeenCalledWith(userId, updateDto);
        });
    });

    describe("remove", () => {
        const userId = "507f1f77bcf86cd799439011";

        it("should delete user", async () => {
            mockUsersService.delete.mockResolvedValue(undefined);

            await controller.remove(userId);

            expect(mockUsersService.delete).toHaveBeenCalledWith(userId);
        });

        it("should throw NotFoundException if user not found", async () => {
            mockUsersService.delete.mockRejectedValue(
                new NotFoundException(`User with ID ${userId} not found`)
            );

            await expect(controller.remove(userId)).rejects.toThrow(NotFoundException);
            expect(mockUsersService.delete).toHaveBeenCalledWith(userId);
        });
    });
});
