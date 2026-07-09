import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ActionLogsModule } from "./action-logs/action-logs.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { ChatModule } from "./chat/chat.module";
import { getEnvFilePaths } from "./config/env";
import { DatabaseModule } from "./database/database.module";
import { HealthController } from "./health/health.controller";
import { MemoriesModule } from "./memories/memories.module";
import { VoiceModule } from "./voice/voice.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: getEnvFilePaths(),
      isGlobal: true
    }),
    ActionLogsModule,
    ApprovalsModule,
    ChatModule,
    DatabaseModule,
    MemoriesModule,
    VoiceModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
