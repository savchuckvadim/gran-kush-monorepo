import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { CreateUserDto } from "@users/api/dto/create-user.dto";
import { UpdateUserDto } from "@users/api/dto/update-user.dto";
import { UserResponseDto } from "@users/api/dto/user-response.dto";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";
import * as bcrypt from "bcrypt";

@Injectable()
export class UsersService {
    constructor(private readonly userRepository: UserRepository) {}

    /**
     * Создать пользователя
     * ВАЖНО: User создается только через MemberService или EmployeeRegistrationService
     * Этот метод используется только для внутренних нужд
     */
    async create(dto: CreateUserDto): Promise<UserResponseDto> {
        // Проверка существования
        const exists = await this.userRepository.existsByEmail(dto.email);
        if (exists) {
            throw new ConflictException("User with this email already exists");
        }

        // Хеширование пароля
        const passwordHash = await bcrypt.hash(dto.password, 10);

        // Создание User (только email и passwordHash)
        const user = await this.userRepository.create({
            email: dto.email,
            passwordHash,
        });

        return this.toResponseDto(user);
    }

    /**
     * Получить пользователя по ID
     */
    async findById(id: string): Promise<UserResponseDto> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return this.toResponseDto(user);
    }

    /**
     * Обновить пользователя
     */
    async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        // Обновление полей (только passwordHash и isActive)
        const updateData: Partial<{
            passwordHash: string;
            isActive: boolean;
        }> = {};

        if (dto.password) {
            updateData.passwordHash = await bcrypt.hash(dto.password, 10);
        }
        if (dto.isActive !== undefined) {
            updateData.isActive = dto.isActive;
        }

        const updatedUser = await this.userRepository.update(id, updateData);
        if (!updatedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        return this.toResponseDto(updatedUser);
    }

    /**
     * Удалить пользователя
     */
    async delete(id: string): Promise<void> {
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        // Удаление через Prisma cascade (удалит связанные Member/Employee)
        await this.userRepository.delete(id);
    }

    /**
     * Получить пользователя по email (для аутентификации)
     * Возвращает Entity с passwordHash
     */
    async findByEmailForAuth(email: string): Promise<User | null> {
        return this.userRepository.findByEmail(email);
    }

    /**
     * Преобразование Entity в Response DTO
     */
    private toResponseDto(user: User): UserResponseDto {
        return {
            id: user.id,
            email: user.email,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
