interface AboutUsValuesCardProps {
    title: string;
    values: string[];
}

export function AboutUsValuesCard({ title, values }: AboutUsValuesCardProps) {
    return (
        <div className="rounded-2xl border bg-card p-6 md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <ul className="mt-4 space-y-3 text-muted-foreground">
                {values.map((value) => (
                    <li key={value}>{value}</li>
                ))}
            </ul>
        </div>
    );
}
