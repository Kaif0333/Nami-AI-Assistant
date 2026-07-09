import { Module } from "@nestjs/common";

import { ActionLogsModule } from "../action-logs/action-logs.module";
import { VoiceController } from "./voice.controller";
import { VoiceService } from "./voice.service";

@Module({
  imports: [ActionLogsModule],
  controllers: [VoiceController],
  providers: [VoiceService]
})
export class VoiceModule {}
