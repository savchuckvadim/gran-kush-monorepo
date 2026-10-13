export interface PersonNameParts {
    name: string;
    surname?: string | null;
}

/** «Имя Фамилия» for a member or an employee; the fallback when both are empty. */
export const personName = (person: PersonNameParts, fallback = "—"): string =>
    `${person.name} ${person.surname ?? ""}`.trim() || fallback;
