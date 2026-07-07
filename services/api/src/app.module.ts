import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ActionLogsModule } from "./action-logs/action-logs.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { ChatModule } from "./chat/chat.module";
import { getEnvFilePaths } from "./config/env";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getEnvFilePaths(),
      isGlobal: true
    }),
    ActionLogsModule,
    ApprovalsModule,
    ChatModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
