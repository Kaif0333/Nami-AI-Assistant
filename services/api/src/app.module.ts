import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ChatModule } from "./chat/chat.module";
import { getEnvFilePaths } from "./config/env";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getEnvFilePaths(),
      isGlobal: true
    }),
    ChatModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
