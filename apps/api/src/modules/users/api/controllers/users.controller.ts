import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    UseGuards,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiNoContentResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from "@nestjs/swagger";

import { AdminGuard } from "@employees/infrastructure/guards/admin.guard";
import { EmployeeJwtAuthGuard } from "@employees/infrastructure/guards/employee-jwt-auth.guard";
import { CreateUserDto } from "@users/api/dto/create-user.dto";
import { UpdateUserDto } from "@users/api/dto/update-user.dto";
import { UserResponseDto } from "@users/api/dto/user-response.dto";
import { UsersService } from "@users/application/services/users.service";

import { Admin } from "@common/decorators/auth/admin.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";

@ApiTags("Users (Admin only)")
@Controller("users")
@UseGuards(EmployeeJwtAuthGuard, AdminGuard)
@Admin()
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @ApiOperation({ summary: "Create a new user" })
    @ApiSuccessResponse(UserResponseDto, {
        status: 201,
        description: "User created successfully",
    })
    @ApiErrorResponse([400, 409])
    async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
        return this.usersService.create(createUserDto);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get user by ID" })
    @ApiParam({ name: "id", description: "User ID" })
    @ApiSuccessResponse(UserResponseDto, {
        description: "User found",
    })
    @ApiErrorResponse([404])
    async findOne(@Param("id") id: string): Promise<UserResponseDto> {
        return this.usersService.findById(id);
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update user" })
    @ApiParam({ name: "id", description: "User ID" })
    @ApiSuccessResponse(UserResponseDto, {
        description: "User updated successfully",
    })
    @ApiErrorResponse([400, 404])
    async update(
        @Param("id") id: string,
        @Body() updateUserDto: UpdateUserDto
    ): Promise<UserResponseDto> {
        return this.usersService.update(id, updateUserDto);
    }

    @Delete(":id")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: "Delete user" })
    @ApiParam({ name: "id", description: "User ID" })
    @ApiNoContentResponse({ description: "User deleted successfully" })
    @ApiErrorResponse([404])
    async remove(@Param("id") id: string): Promise<void> {
        return this.usersService.delete(id);
    }
}
