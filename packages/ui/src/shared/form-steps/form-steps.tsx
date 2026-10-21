import { FormStep, type FormStepState } from "./form-step";

export interface FormStepsItem {
    id: string;
    title: string;
}

export interface FormStepsProps {
    steps: readonly FormStepsItem[];
    current: string;
    /** Steps that open on click; the others are shown but stay inert */
    reachable?: readonly string[];
    onSelect?: (id: string) => void;
    /** "Step 2 of 3": the name of the step list for screen readers */
    counter?: string;
    className?: string;
}

/**
 * Progress of a form split into steps: done steps get a check, the current one its title (on a
 * phone the other titles hide to keep the row on one line). Pair it with step-by-step content
 * and Back / Next actions; for edit forms pass every step as `reachable` to use it as tabs.
 */
export function FormSteps({
    steps,
    current,
    reachable,
    onSelect,
    counter,
    className,
}: FormStepsProps) {
    const currentIndex = steps.findIndex((step) => step.id === current);
    const stateOf = (index: number): FormStepState =>
        index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";

    return (
        <nav aria-label={counter} className={className}>
            <ol className="flex items-center gap-2">
                {steps.map((step, index) => {
                    const selectable =
                        onSelect && step.id !== current && reachable?.includes(step.id);
                    return (
                        <FormStep
                            key={step.id}
                            number={index + 1}
                            title={step.title}
                            state={stateOf(index)}
                            last={index === steps.length - 1}
                            onSelect={selectable ? () => onSelect(step.id) : undefined}
                        />
                    );
                })}
            </ol>
        </nav>
    );
}
