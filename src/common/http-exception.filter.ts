import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: unknown =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    if (typeof message === 'string') {
      message = { message };
    }

    const payload =
      typeof message === 'object' && message !== null ? message : { message };

    response.status(status).json({
      statusCode: status,
      ...payload,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

