import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";

import { CreateActionLogDto } from "./dto/create-action-log.dto";
import { ActionLogsService } from "./action-logs.service";

@Controller("action-logs")
export class ActionLogsController {
  constructor(
    @Inject(ActionLogsService)
    private readonly actionLogsService: ActionLogsService
  ) {}

  @Get()
  listActionLogs(
    @Query("status") status?: string,
    @Query("riskLevel") riskLevel?: string,
    @Query("actionType") actionType?: string
  ) {
    return {
      success: true,
      data: {
        logs: this.actionLogsService.listActionLogs({
          status: status as never,
          riskLevel: riskLevel as never,
          actionType
        })
      }
    };
  }

  @Get(":id")
  getActionLog(@Param("id") id: string) {
    return {
      success: true,
      data: this.actionLogsService.getActionLog(id)
    };
  }

  @Post()
  createActionLog(@Body() body: CreateActionLogDto) {
    return {
      success: true,
      data: this.actionLogsService.createActionLog(body)
    };
  }
}
