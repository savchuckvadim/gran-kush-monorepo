import { AboutUsPrinciple } from "../types";

interface AboutUsPrinciplesGridProps {
    title: string;
    principles: AboutUsPrinciple[];
}

export function AboutUsPrinciplesGrid({ title, principles }: AboutUsPrinciplesGridProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <div className="grid gap-4 md:grid-cols-3">
                {principles.map((principle) => (
                    <div key={principle.title} className="rounded-xl border bg-card p-5">
                        <h3 className="text-lg font-semibold">{principle.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {principle.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
