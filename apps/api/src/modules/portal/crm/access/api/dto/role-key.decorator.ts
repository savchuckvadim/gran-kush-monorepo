import { applyDecorators } from "@nestjs/common";

import { IsString, Matches, MaxLength } from "class-validator";

const ROLE_KEY = /^[a-z][a-z0-9_]*$/;
const ROLE_KEY_MAX = 64;

/** Ключ роли клуба: `employee`, `manager`, `custom_…`. Есть ли такая роль в клубе — решает сервис. */
export const IsRoleKey = () =>
    applyDecorators(IsString(), MaxLength(ROLE_KEY_MAX), Matches(ROLE_KEY));
