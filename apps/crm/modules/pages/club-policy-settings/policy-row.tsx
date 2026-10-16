import { Switch } from "@workspace/ui";

interface PolicyRowProps {
    title: string;
    description: string;
    checked: boolean;
    disabled: boolean;
    onChange: (checked: boolean) => void;
}

/** One club rule: what it means and a switch. */
export function PolicyRow({ title, description, checked, disabled, onChange }: PolicyRowProps) {
    return (
        <li className="flex items-start justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
                <p className="font-medium">{title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch
                checked={checked}
                disabled={disabled}
                onCheckedChange={onChange}
                aria-label={title}
                className="mt-0.5 shrink-0"
            />
        </li>
    );
}
