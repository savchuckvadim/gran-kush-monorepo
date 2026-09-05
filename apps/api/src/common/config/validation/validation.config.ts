import { ValidationPipe, ValidationPipeOptions } from "@nestjs/common";

/**
 * `whitelist` срезает поля, которых нет в DTO; `forbidNonWhitelisted` превращает такое поле
 * в 400 вместо тихой потери данных — опечатка в имени поля на клиенте всплывает сразу.
 *
 * Следствие для контроллеров: на один хендлер — один `@Query()` DTO. Два DTO на одном
 * объекте query невозможны: каждый отвергнет поля другого. Фильтры и пагинацию
 * объединяет `IntersectionType(PaginationDto, XxxFilterDto)`.
 *
 * Пайп регистрируется через `APP_PIPE` в `AppModule`, а не в `main.ts`: e2e-тесты
 * поднимают `AppModule` и проверяют тот же контракт, что и прод.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
};

export const createValidationPipe = (): ValidationPipe =>
    new ValidationPipe(VALIDATION_PIPE_OPTIONS);
