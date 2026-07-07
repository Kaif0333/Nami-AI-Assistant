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
  const webOrigin =
    config.get<string>("WEB_DASHBOARD_ORIGIN") ?? "http://localhost:3000";

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: webOrigin,
    methods: ["GET", "POST", "OPTIONS"],
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
