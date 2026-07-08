import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query
} from "@nestjs/common";

import { ActionLogsService } from "../action-logs/action-logs.service";
import { CreateMemoryDto } from "./dto/create-memory.dto";
import { UpdateMemoryDto } from "./dto/update-memory.dto";
import { MemoriesService } from "./memories.service";

@Controller("memories")
export class MemoriesController {
  constructor(
    @Inject(MemoriesService)
    private readonly memoriesService: MemoriesService,
    @Inject(ActionLogsService)
    private readonly actionLogsService: ActionLogsService
  ) {}

  @Get("vector-status")
  getVectorStatus() {
    return {
      success: true,
      data: this.memoriesService.getVectorStatus()
    };
  }

  @Get()
  async listMemories(
    @Query("type") type?: string,
    @Query("sensitivity") sensitivity?: string,
    @Query("status") status?: string,
    @Query("query") query?: string,
    @Query("tag") tag?: string
  ) {
    return {
      success: true,
      data: {
        memories: await this.memoriesService.listMemories({
          type: type as never,
          sensitivity: sensitivity as never,
          status: status as never,
          query,
          tag
        })
      }
    };
  }

  @Post()
  async createMemory(@Body() body: CreateMemoryDto) {
    const memory = await this.memoriesService.createMemory(body);

    await this.actionLogsService.createActionLog({
      actionType: "memory_save",
      summary: `Saved memory: ${memory.title}`,
      status: "completed",
      riskLevel: "low",
      inputPreview: {
        type: memory.type,
        title: memory.title,
        sensitivity: memory.sensitivity,
        tags: memory.tags
      },
      outputPreview: { memoryId: memory.id },
      metadata: { source: "memory_center" }
    });

    return {
      success: true,
      data: memory
    };
  }

  @Get(":id")
  async getMemory(@Param("id") id: string) {
    return {
      success: true,
      data: await this.memoriesService.getMemory(id)
    };
  }

  @Patch(":id")
  async updateMemory(@Param("id") id: string, @Body() body: UpdateMemoryDto) {
    const memory = await this.memoriesService.updateMemory(id, body);

    await this.actionLogsService.createActionLog({
      actionType: "memory_update",
      summary: `Updated memory: ${memory.title}`,
      status: "completed",
      riskLevel: "low",
      inputPreview: { memoryId: memory.id },
      outputPreview: {
        status: memory.status,
        sensitivity: memory.sensitivity,
        tags: memory.tags
      },
      metadata: { source: "memory_center" }
    });

    return {
      success: true,
      data: memory
    };
  }

  @Post(":id/disable")
  async disableMemory(@Param("id") id: string) {
    const memory = await this.memoriesService.disableMemory(id);

    await this.actionLogsService.createActionLog({
      actionType: "memory_disable",
      summary: `Disabled memory: ${memory.title}`,
      status: "completed",
      riskLevel: "low",
      inputPreview: { memoryId: memory.id },
      outputPreview: { status: memory.status },
      metadata: { source: "memory_center" }
    });

    return {
      success: true,
      data: memory
    };
  }

  @Delete(":id")
  async deleteMemory(@Param("id") id: string) {
    const memory = await this.memoriesService.deleteMemory(id);

    await this.actionLogsService.createActionLog({
      actionType: "memory_delete",
      summary: `Deleted memory: ${memory.title}`,
      status: "completed",
      riskLevel: "low",
      inputPreview: { memoryId: memory.id },
      outputPreview: { deleted: true },
      metadata: { source: "memory_center" }
    });

    return {
      success: true,
      data: memory
    };
  }
}
