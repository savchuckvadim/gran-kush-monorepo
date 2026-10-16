// Дерево кабинета участника. Открывается только на хосте club.* (proxy.ts переписывает видимый
// адрес сюда); на хосте CRM оно закрыто. Схема адресов — modules/shared/config/club-routes.ts.
export const dynamic = "force-dynamic";

export default function CabinetTreeLayout({ children }: { children: React.ReactNode }) {
    return children;
}
