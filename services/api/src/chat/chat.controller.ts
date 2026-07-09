import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { ChatService } from "./chat.service";
import { ChatRequestDto } from "./dto/chat-request.dto";

@Controller("chat")
export class ChatController {
  constructor(@Inject(ChatService) private readonly chatService: ChatService) {}

  @Get("conversations")
  async listConversations() {
    return {
      success: true,
      data: {
        conversations: await this.chatService.listConversations()
      }
    };
  }

  @Get("conversations/:id")
  async getConversation(@Param("id") id: string) {
    return {
      success: true,
      data: await this.chatService.getConversation(id)
    };
  }

  @Post()
  async createChatResponse(@Body() body: ChatRequestDto) {
    const data = await this.chatService.sendMessage(body);

    return {
      success: true,
      data
    };
  }
}
