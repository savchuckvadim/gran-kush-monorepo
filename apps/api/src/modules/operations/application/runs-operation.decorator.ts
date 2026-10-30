import { SetMetadata } from "@nestjs/common";

import type { OperationDefinition } from "../domain/operation";
import { OPERATION_RUNNER_METADATA } from "../operations.constants";

/**
 * Класс-провайдер выполняет операции этого вида: воркер очереди находит его по `kind` в реестре.
 * Один вид — один класс; класс реализует `OperationRunner<typeof definition>` и объявлен
 * провайдером своего модуля.
 */
export const RunsOperation = (definition: OperationDefinition): ClassDecorator =>
    SetMetadata(OPERATION_RUNNER_METADATA, definition.kind);
