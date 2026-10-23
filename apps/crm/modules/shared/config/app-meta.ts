import { BRAND } from "./brand";

/**
 * Цвет бренда инсталляции для браузера: полоса адреса на телефоне и установленное приложение.
 * Это первый цвет градиента знака (`BRAND.palette`).
 */
export const BRAND_COLOR = BRAND.palette[0];

/** Фон под полосой адреса: светлая и тёмная базовые темы. */
export const THEME_COLORS = { light: "#ffffff", dark: "#18181b" } as const;
