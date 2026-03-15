import { ContactsInfoItem } from "../types";

interface ContactsInfoListProps {
    items: ContactsInfoItem[];
}

export function ContactsInfoList({ items }: ContactsInfoListProps) {
    return (
        <div className="space-y-6">
            {items.map((item) => {
                const Icon = item.icon;

                return (
                    <div key={item.key} className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Icon className="size-5 text-primary" />
                            <h3 className="text-lg font-semibold">{item.label}</h3>
                        </div>
                        {item.href ? (
                            <p
                                className={
                                    item.multiline
                                        ? "text-muted-foreground whitespace-pre-line"
                                        : "text-muted-foreground"
                                }
                            >
                                <a
                                    href={item.href}
                                    className="hover:text-foreground transition-colors"
                                >
                                    {item.value}
                                </a>
                            </p>
                        ) : (
                            <p
                                className={
                                    item.multiline
                                        ? "text-muted-foreground whitespace-pre-line"
                                        : "text-muted-foreground"
                                }
                            >
                                {item.value}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
