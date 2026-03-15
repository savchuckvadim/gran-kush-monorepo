import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { CreateUserDto } from "@users/api/dto/create-user.dto";
import { UpdateUserDto } from "@users/api/dto/update-user.dto";
import { UserQueryDto } from "@users/api/dto/user-query.dto";
import { UsersService } from "@users/application/services/users.service";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/infrastructure/repositories/user.repository";
import { UserDocument } from "@users/infrastructure/schemas/user.schema";
import * as bcrypt from "bcrypt";

import { SortOrder } from "@common/paginate/dto/pagination.dto";

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
        name: "Test User",
        phone: "+1234567890",
        isActive: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
    };

    const mockUserDocument = {
        _id: { toString: () => mockUser.id },
        email: mockUser.email,
        passwordHash: mockUser.passwordHash,
        name: mockUser.name,
        phone: mockUser.phone,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
    } as unknown as UserDocument;

    const mockUserRepository = {
        existsByEmail: jest.fn(),
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        getModel: jest.fn(),
        mapDocumentToEntity: jest.fn(),
    };

    const mockModel = {
        find: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn(),
        countDocuments: jest.fn().mockReturnThis(),
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
            name: "Test User",
            phone: "+1234567890",
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
                name: createDto.name,
                phone: createDto.phone,
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

    describe("findAll", () => {
        const queryDto: UserQueryDto = {
            page: 1,
            limit: 10,
            sortBy: "createdAt",
            sortOrder: SortOrder.DESC,
        };

        it("should return paginated users", async () => {
            const mockDocs = [mockUserDocument];
            const mockTotal = 1;

            mockUserRepository.getModel.mockReturnValue(mockModel);
            mockModel.exec.mockResolvedValueOnce(mockDocs).mockResolvedValueOnce(mockTotal);
            mockUserRepository.mapDocumentToEntity.mockReturnValue(mockUser);

            const result = await service.findAll(queryDto);

            expect(result).toHaveProperty("items");
            expect(result).toHaveProperty("total");
            expect(result).toHaveProperty("page");
            expect(result).toHaveProperty("limit");
            expect(result.items).toHaveLength(1);
            expect(result.total).toBe(mockTotal);
        });

        it("should apply search filter", async () => {
            const searchQuery: UserQueryDto = {
                ...queryDto,
                search: "test",
            };

            mockUserRepository.getModel.mockReturnValue(mockModel);
            mockModel.exec.mockResolvedValueOnce([mockUserDocument]).mockResolvedValueOnce(1);
            mockUserRepository.mapDocumentToEntity.mockReturnValue(mockUser);

            await service.findAll(searchQuery);

            expect(mockModel.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    $or: expect.arrayContaining([
                        expect.objectContaining({
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            email: expect.objectContaining({
                                $regex: "test",
                            }),
                        }),
                    ]),
                })
            );
        });

        it("should apply isActive filter", async () => {
            const activeQuery: UserQueryDto = {
                ...queryDto,
                isActive: true,
            };

            mockUserRepository.getModel.mockReturnValue(mockModel);
            mockModel.exec.mockResolvedValueOnce([mockUserDocument]).mockResolvedValueOnce(1);
            mockUserRepository.mapDocumentToEntity.mockReturnValue(mockUser);

            await service.findAll(activeQuery);

            expect(mockModel.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    isActive: true,
                })
            );
        });

        it("should use default pagination values", async () => {
            const emptyQuery: UserQueryDto = {};

            mockUserRepository.getModel.mockReturnValue(mockModel);
            mockModel.exec.mockResolvedValueOnce([]).mockResolvedValueOnce(0);
            mockUserRepository.mapDocumentToEntity.mockReturnValue(mockUser);

            const result = await service.findAll(emptyQuery);

            expect(result.page).toBe(1);
            expect(result.limit).toBe(10);
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
                name: mockUser.name,
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
            name: "Updated Name",
            phone: "+9876543210",
            isActive: false,
        };

        const updatedUser: User = {
            ...mockUser,
            ...updateDto,
        };

        it("should update user successfully", async () => {
            mockUserRepository.findById.mockResolvedValue(mockUser);
            mockUserRepository.update.mockResolvedValue(updatedUser);

            const result = await service.update(mockUser.id, updateDto);

            expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUser.id);
            expect(mockUserRepository.update).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    name: updateDto.name,
                    phone: updateDto.phone,
                    isActive: updateDto.isActive,
                })
            );
            expect(result.name).toBe(updateDto.name);
            expect(result.phone).toBe(updateDto.phone);
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
                name: "New Name",
            };

            const partiallyUpdatedUser: User = {
                ...mockUser,
                name: "New Name",
            };

            mockUserRepository.findById
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(partiallyUpdatedUser);
            mockUserRepository.update.mockResolvedValue(partiallyUpdatedUser);

            const result = await service.update(mockUser.id, partialDto);

            expect(mockUserRepository.update).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    name: partialDto.name,
                })
            );
            expect(result.name).toBe(partialDto.name);
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
