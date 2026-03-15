import { applyDecorators, HttpStatus } from "@nestjs/common";
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiNotFoundResponse,
    ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { ApiErrorResponseDto } from "@common/dto/api-error-response.dto";

type SwaggerErrorDecorator = MethodDecorator & ClassDecorator;
type SwaggerErrorDecoratorFactory = (options: {
    description: string;
    type: typeof ApiErrorResponseDto;
}) => SwaggerErrorDecorator;

/**
 * HTTP status code descriptions mapping
 */
const ERROR_DESCRIPTIONS: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: "Bad Request",
    [HttpStatus.UNAUTHORIZED]: "Unauthorized",
    [HttpStatus.FORBIDDEN]: "Forbidden",
    [HttpStatus.NOT_FOUND]: "Not Found",
    [HttpStatus.CONFLICT]: "Conflict",
    [HttpStatus.INTERNAL_SERVER_ERROR]: "Internal Server Error",
};

/**
 * HTTP status code to Swagger decorator mapping
 */
const ERROR_DECORATORS: Record<number, SwaggerErrorDecoratorFactory> = {
    [HttpStatus.BAD_REQUEST]: (opts) => ApiBadRequestResponse(opts),
    [HttpStatus.UNAUTHORIZED]: (opts) => ApiUnauthorizedResponse(opts),
    [HttpStatus.FORBIDDEN]: (opts) => ApiForbiddenResponse(opts),
    [HttpStatus.NOT_FOUND]: (opts) => ApiNotFoundResponse(opts),
    [HttpStatus.CONFLICT]: (opts) => ApiConflictResponse(opts),
    [HttpStatus.INTERNAL_SERVER_ERROR]: (opts) => ApiInternalServerErrorResponse(opts),
};

/**
 * Decorator for documenting error responses in Swagger
 * Accepts an array of HTTP status codes and generates appropriate Swagger decorators
 *
 * @example
 * @ApiErrorResponse([400, 401])
 * @ApiErrorResponse([404])
 * @ApiErrorResponse([400, 409])
 */
export const ApiErrorResponse = (statusCodes: number[]) => {
    const decorators = statusCodes.flatMap((code): SwaggerErrorDecorator[] => {
            const decoratorFn = ERROR_DECORATORS[code];
            if (!decoratorFn) {
                return [];
            }
            return [
                decoratorFn({
                    description: ERROR_DESCRIPTIONS[code] || `Error ${code}`,
                    type: ApiErrorResponseDto,
                }),
            ];
        });

    return applyDecorators(...decorators);
};
