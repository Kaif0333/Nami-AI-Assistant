import { Body, Controller, Get, Inject, Post } from "@nestjs/common";

import { SynthesizeVoiceDto } from "./dto/synthesize-voice.dto";
import { TranscribeVoiceDto } from "./dto/transcribe-voice.dto";
import { VoiceService } from "./voice.service";

@Controller("voice")
export class VoiceController {
  constructor(@Inject(VoiceService) private readonly voiceService: VoiceService) {}

  @Get("status")
  getStatus() {
    return {
      success: true,
      data: this.voiceService.getStatus()
    };
  }

  @Post("transcriptions")
  async transcribe(@Body() body: TranscribeVoiceDto) {
    return {
      success: true,
      data: await this.voiceService.transcribe(body)
    };
  }

  @Post("speech")
  async synthesize(@Body() body: SynthesizeVoiceDto) {
    return {
      success: true,
      data: await this.voiceService.synthesize(body)
    };
  }
}
