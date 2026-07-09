import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";
import { AppHttpExceptionFilter } from "./common/filters/app-http-exception.filter";
import { isAllowedCorsOrigin, resolveWebOrigins } from "./config/cors";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger("NamiApi");
  const port = Number(config.get("API_PORT") ?? config.get("PORT") ?? 4000);
  const webOriginConfig =
    config.get<string>("WEB_DASHBOARD_ORIGIN") ?? "http://localhost:3000";
  const appEnv = config.get<string>("APP_ENV") ?? "development";
  const webOrigins = resolveWebOrigins(webOriginConfig, appEnv);

  app.setGlobalPrefix("api");
  app.useBodyParser("json", { limit: "16mb" });
  app.enableCors({
    origin(
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void
    ) {
      if (isAllowedCorsOrigin(origin, webOrigins)) {
        callback(null, true);
        return;
      }

      logger.warn(`Blocked API request from untrusted origin: ${origin}`);
      callback(null, false);
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  });
  app.useGlobalFilters(new AppHttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );

  await app.listen(port);
  logger.log(`Nami API listening on http://localhost:${port}/api`);
}

void bootstrap();
