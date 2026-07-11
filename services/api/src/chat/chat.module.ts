import { Module } from "@nestjs/common";

import { ActionLogsModule } from "../action-logs/action-logs.module";
import { AiModule } from "../ai/ai.module";
import { ApprovalsModule } from "../approvals/approvals.module";
import { DatabaseModule } from "../database/database.module";
import { MemoriesModule } from "../memories/memories.module";
import { ResearchModule } from "../research/research.module";
import { SafetyModule } from "../safety/safety.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [
    ActionLogsModule,
    AiModule,
    ApprovalsModule,
    DatabaseModule,
    MemoriesModule,
    ResearchModule,
    SafetyModule
  ],
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}
