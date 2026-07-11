import { Module } from "@nestjs/common";

import { ActionLogsModule } from "../action-logs/action-logs.module";
import { AiModule } from "../ai/ai.module";
import { DatabaseModule } from "../database/database.module";
import { GeminiGroundedResearchProvider } from "./gemini-grounded-research.provider";
import { ResearchController } from "./research.controller";
import { ResearchService } from "./research.service";

@Module({
  imports: [ActionLogsModule, AiModule, DatabaseModule],
  controllers: [ResearchController],
  providers: [GeminiGroundedResearchProvider, ResearchService],
  exports: [ResearchService]
})
export class ResearchModule {}
