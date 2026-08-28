export * from "./api";

export const authKeys = {
    all: ["auth"] as const,
    current: () => [...authKeys.all, "current"] as const,
};
