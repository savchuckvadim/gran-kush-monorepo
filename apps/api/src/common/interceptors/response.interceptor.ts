import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";

import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Response Interceptor
 * Оборачивает все ответы в объект { data: ... }
 *
 * @example
 * // До: { id: 1, name: "John" }
 * // После: { data: { id: 1, name: "John" } }
 */
export interface ResponseResult<T> {
    result: T;
}
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ResponseResult<T>> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseResult<T>> {
        return next.handle().pipe(
            map((data) => ({
                result: data,
            }))
        );
    }
}
