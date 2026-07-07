import { Module } from "@nestjs/common";

import { ActionLogsModule } from "../action-logs/action-logs.module";
import { AiModule } from "../ai/ai.module";
import { ApprovalsModule } from "../approvals/approvals.module";
import { SafetyModule } from "../safety/safety.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

@Module({
  imports: [ActionLogsModule, AiModule, ApprovalsModule, SafetyModule],
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}
