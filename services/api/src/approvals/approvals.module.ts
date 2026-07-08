import { Module } from "@nestjs/common";

import { ActionLogsModule } from "../action-logs/action-logs.module";
import { DatabaseModule } from "../database/database.module";
import { SafetyModule } from "../safety/safety.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [ActionLogsModule, DatabaseModule, SafetyModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService]
})
export class ApprovalsModule {}
