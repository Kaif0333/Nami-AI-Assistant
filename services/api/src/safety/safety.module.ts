import { Module } from "@nestjs/common";

import { SafeActionPolicyService } from "./safe-action-policy.service";

@Module({
  providers: [SafeActionPolicyService],
  exports: [SafeActionPolicyService]
})
export class SafetyModule {}
