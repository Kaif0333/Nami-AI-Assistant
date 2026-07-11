import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";

import { CreateResearchDto, ListResearchDto } from "./dto/create-research.dto";
import { ResearchService } from "./research.service";

@Controller("research")
export class ResearchController {
  constructor(
    @Inject(ResearchService)
    private readonly researchService: ResearchService
  ) {}

  @Get("status")
  getStatus() {
    return {
      success: true,
      data: this.researchService.getStatus()
    };
  }

  @Post()
  async createResearch(@Body() body: CreateResearchDto) {
    return {
      success: true,
      data: await this.researchService.runResearch(body)
    };
  }

  @Get()
  async listResearchRuns(@Query() filters: ListResearchDto) {
    const researchRuns = await this.researchService.listResearchRuns({
      mode: filters.mode,
      status: filters.status
    });
    const query = filters.query?.toLowerCase();

    return {
      success: true,
      data: {
        researchRuns: query
          ? researchRuns.filter((run) => run.query.toLowerCase().includes(query))
          : researchRuns
      }
    };
  }

  @Get(":id")
  async getResearchRun(@Param("id") id: string) {
    return {
      success: true,
      data: await this.researchService.getResearchRun(id)
    };
  }
}
