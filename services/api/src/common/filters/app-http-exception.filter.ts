import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

type JsonResponse = {
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
};

type ErrorBody = {
  message?: string | string[];
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
};

@Catch()
export class AppHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<JsonResponse>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception instanceof Prisma.PrismaClientKnownRequestError
          ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Prisma.PrismaClientKnownRequestError
          ? {
              code: "DATABASE_NOT_READY",
              message:
                "Database is configured but not ready. Run database migrations and retry.",
              details: { prismaCode: exception.code }
            }
          : undefined;
    const error = this.normalizeError(status, body);

    if (status >= 500) {
      this.logger.error(
        error.message,
        exception instanceof Error ? exception.stack : undefined
      );
    }

    response.status(status).json({
      success: false,
      error
    });
  }

  private normalizeError(status: number, body: unknown) {
    if (typeof body === "object" && body !== null) {
      const errorBody = body as ErrorBody;
      const validationMessages = Array.isArray(errorBody.message)
        ? errorBody.message
        : undefined;

      return {
        code:
          errorBody.code ??
          (validationMessages ? "VALIDATION_ERROR" : this.codeFromStatus(status)),
        message:
          validationMessages?.join("; ") ??
          errorBody.message?.toString() ??
          this.messageFromStatus(status),
        details: validationMessages
          ? { validation: validationMessages }
          : errorBody.details ?? {}
      };
    }

    return {
      code: this.codeFromStatus(status),
      message: this.messageFromStatus(status),
      details: {}
    };
  }

  private codeFromStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      case HttpStatus.SERVICE_UNAVAILABLE:
        return "SERVICE_UNAVAILABLE";
      case HttpStatus.BAD_GATEWAY:
        return "UPSTREAM_MODEL_ERROR";
      default:
        return status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_ERROR";
    }
  }

  private messageFromStatus(status: number) {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "Invalid request.";
      case HttpStatus.SERVICE_UNAVAILABLE:
        return "Service is unavailable.";
      case HttpStatus.BAD_GATEWAY:
        return "Upstream model request failed.";
      default:
        return status >= 500 ? "Unexpected server error." : "Request failed.";
    }
  }
}
