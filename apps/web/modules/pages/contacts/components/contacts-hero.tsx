interface ContactsHeroProps {
    title: string;
    subtitle: string;
}

export function ContactsHero({ title, subtitle }: ContactsHeroProps) {
    return (
        <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
            <p className="text-lg text-muted-foreground">{subtitle}</p>
        </div>
    );
}
