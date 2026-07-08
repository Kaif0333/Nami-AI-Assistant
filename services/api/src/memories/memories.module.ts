import { Module } from "@nestjs/common";

import { ActionLogsModule } from "../action-logs/action-logs.module";
import { DatabaseModule } from "../database/database.module";
import { MemoriesController } from "./memories.controller";
import { MemoriesService } from "./memories.service";

@Module({
  imports: [ActionLogsModule, DatabaseModule],
  controllers: [MemoriesController],
  providers: [MemoriesService],
  exports: [MemoriesService]
})
export class MemoriesModule {}
