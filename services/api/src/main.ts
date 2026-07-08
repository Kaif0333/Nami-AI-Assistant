import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { AppHttpExceptionFilter } from "./common/filters/app-http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger("NamiApi");
  const port = Number(config.get("API_PORT") ?? config.get("PORT") ?? 4000);
  const webOriginConfig =
    config.get<string>("WEB_DASHBOARD_ORIGIN") ?? "http://localhost:3000";
  const appEnv = config.get<string>("APP_ENV") ?? "development";
  const webOrigins = resolveWebOrigins(webOriginConfig, appEnv);

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: webOrigins,
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

function resolveWebOrigins(webOriginConfig: string, appEnv: string) {
  const origins = webOriginConfig
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (appEnv !== "production") {
    if (origins.includes("http://localhost:3000")) {
      origins.push("http://127.0.0.1:3000");
    }

    if (origins.includes("http://127.0.0.1:3000")) {
      origins.push("http://localhost:3000");
    }
  }

  return [...new Set(origins)];
}
