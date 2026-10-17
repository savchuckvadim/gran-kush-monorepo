/** Где показана карточка: своя страница или слайдер поверх другой страницы. */
export type EmployeeCardLayout = "page" | "slider";

export interface EmployeeCardProps {
    employeeId: string;
    layout?: EmployeeCardLayout;
}
