import { EmployeePage } from "@/modules/pages/employees";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <EmployeePage employeeId={id} />;
}
