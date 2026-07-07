import { Body, Controller, Inject, Post } from "@nestjs/common";

import { ChatService } from "./chat.service";
import { ChatRequestDto } from "./dto/chat-request.dto";

@Controller("chat")
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Post()
  async createChatResponse(@Body() body: ChatRequestDto) {
    const data = await this.chatService.sendMessage(body);

    return {
      success: true,
      data
    };
  }
}
