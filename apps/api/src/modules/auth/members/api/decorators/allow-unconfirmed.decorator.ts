import { SetMetadata } from "@nestjs/common";

/**
 * Ключ метаданных для разрешения доступа неподтверждённому пользователю (user.isActive === false).
 * Используется для эндпоинтов, доступных сразу после регистрации (например, загрузка файлов).
 */
export const ALLOW_UNCONFIRMED_KEY = "allowUnconfirmed";

/**
 * Разрешает доступ по JWT без проверки user.isActive (email не подтверждён).
 * Только для ограниченного набора эндпоинтов (например, POST /lk/auth/member/files).
 */
export const AllowUnconfirmed = () => SetMetadata(ALLOW_UNCONFIRMED_KEY, true);
