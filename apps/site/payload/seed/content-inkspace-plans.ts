// Placeholder plans of Ink Space until the studio prices are set (TASK-764).
import type { PlanSeed } from "./seed-types";

// The plan table has three fixed slots (barrio, club, cadena); here they carry the studio plans.
export const INKSPACE_PLANS: PlanSeed[] = [
    {
        code: "barrio",
        name: "Solo",
        order: 1,
        forWhom: { es: "Para artistas que trabajan solos", ru: "Для мастера, который работает один", en: "For artists working on their own" },
        features: [
            { id: "solo-1", text: { es: "1 artista", ru: "1 мастер", en: "1 artist" } },
            { id: "solo-2", text: { es: "Clientes, catálogo y pedidos", ru: "Клиенты, каталог и заказы", en: "Clients, catalog and orders" } },
            { id: "solo-3", text: { es: "Zona del cliente", ru: "Кабинет клиента", en: "Client area" } },
        ],
        maxMembers: null,
        highlight: false,
        billing: { monthlyCode: "solo-month", yearlyCode: "solo-year", fallbackMonthly: 19, fallbackYearly: 15 },
    },
    {
        code: "club",
        name: "Estudio",
        order: 2,
        forWhom: { es: "Para estudios con equipo", ru: "Для студии с командой", en: "For studios with a team" },
        features: [
            { id: "estudio-1", text: { es: "Hasta 5 artistas", ru: "До 5 мастеров", en: "Up to 5 artists" } },
            { id: "estudio-2", text: { es: "Todo lo de Solo", ru: "Всё из Solo", en: "Everything in Solo" } },
            { id: "estudio-3", text: { es: "Caja e impuestos", ru: "Касса и налоги", en: "Cash and tax" } },
            { id: "estudio-4", text: { es: "Roles del equipo", ru: "Роли команды", en: "Team roles" } },
        ],
        maxMembers: null,
        highlight: true,
        billing: { monthlyCode: "estudio-month", yearlyCode: "estudio-year", fallbackMonthly: 39, fallbackYearly: 31 },
    },
    {
        code: "cadena",
        name: "Colectivo",
        order: 3,
        forWhom: { es: "Para varios estudios", ru: "Для нескольких студий", en: "For several studios" },
        features: [
            { id: "colectivo-1", text: { es: "Artistas ilimitados", ru: "Без лимита мастеров", en: "Unlimited artists" } },
            { id: "colectivo-2", text: { es: "Varios estudios en una cuenta", ru: "Несколько студий в одном аккаунте", en: "Several studios in one account" } },
            { id: "colectivo-3", text: { es: "Soporte prioritario", ru: "Приоритетная поддержка", en: "Priority support" } },
        ],
        maxMembers: null,
        highlight: false,
        billing: { monthlyCode: "colectivo-month", yearlyCode: "colectivo-year", fallbackMonthly: 79, fallbackYearly: 63 },
    },
];
