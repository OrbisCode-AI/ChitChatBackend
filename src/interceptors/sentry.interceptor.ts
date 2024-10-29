import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import * as Sentry from "@sentry/nestjs";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const { method, url } = request;
    // Set transaction name based on route
    const activeSpan = Sentry.getActiveSpan();
    if (activeSpan) {
      activeSpan.updateName(`${method} ${url}`);
    }

    return next.handle().pipe(
      tap({
        error: (error) => {
          Sentry.captureException(error);
        },
      }),
    );
  }
}
