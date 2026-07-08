import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { SafetyModule } from "../safety/safety.module";
import { ActionLogsController } from "./action-logs.controller";
import { ActionLogsService } from "./action-logs.service";

@Module({
  imports: [DatabaseModule, SafetyModule],
  controllers: [ActionLogsController],
  providers: [ActionLogsService],
  exports: [ActionLogsService]
})
export class ActionLogsModule {}
