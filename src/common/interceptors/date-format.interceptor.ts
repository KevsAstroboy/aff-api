import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { transformDates } from '../utils/date-format.util';

@Injectable()
export class DateFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const customFormat = request.query?.dateFormat as string | undefined;

    return next.handle().pipe(
      map((data) => transformDates(data, customFormat)),
    );
  }
}
