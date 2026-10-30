/** Данные задачи `run`: только id — вход и автор лежат в строке `operations`, не в Redis. */
export interface RunOperationJobData {
    operationId: string;
}
