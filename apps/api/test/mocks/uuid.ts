// Jest-подмена ESM-only пакета uuid (v13) для e2e-тестов
import { randomUUID } from "crypto";

export const v4 = (): string => randomUUID();
