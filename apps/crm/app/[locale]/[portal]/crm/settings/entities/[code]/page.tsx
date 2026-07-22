import { EntitySettingsPage } from "@/modules/pages/entity-settings";

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    return <EntitySettingsPage code={code} />;
}
