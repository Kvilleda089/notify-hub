import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { ApiResponseDto } from "../dto/api-response.dto";
import { map, Observable } from "rxjs";


@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {

    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseDto<T>>  {
        return next.handle().pipe(
            map((data) => ({
                success: true,
                data,
                meta: {
                    timestamp: new Date().toISOString(),
                }
            }))
        )
    }

}