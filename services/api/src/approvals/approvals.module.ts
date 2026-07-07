import { Module } from "@nestjs/common";

import { ActionLogsModule } from "../action-logs/action-logs.module";
import { SafetyModule } from "../safety/safety.module";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";

@Module({
  imports: [ActionLogsModule, SafetyModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService]
})
export class ApprovalsModule {}
