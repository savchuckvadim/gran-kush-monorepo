import { Button, FieldInput } from "@workspace/ui";

import { ContactsFormContent } from "../types";

interface ContactsFormCardProps {
    form: ContactsFormContent;
}

export function ContactsFormCard({ form }: ContactsFormCardProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">{form.title}</h3>
            <form className="space-y-4">
                <FieldInput label={form.nameLabel} type="text" placeholder={form.nameLabel} />
                <FieldInput
                    label={form.emailLabel}
                    type="email"
                    placeholder={form.emailPlaceholder}
                />
                <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium leading-none">
                        {form.messageLabel}
                    </label>
                    <textarea
                        id="message"
                        rows={5}
                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder={form.messageLabel}
                    />
                </div>
                <Button type="submit" className="w-full">
                    {form.submitLabel}
                </Button>
            </form>
        </div>
    );
}
