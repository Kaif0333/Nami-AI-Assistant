import { Body, Controller, Get, Inject, Param, Post, Query } from "@nestjs/common";

import { ActionLogsService } from "../action-logs/action-logs.service";
import { ApprovalDecisionDto } from "./dto/approval-decision.dto";
import { CreateApprovalRequestDto } from "./dto/create-approval-request.dto";
import { ApprovalsService } from "./approvals.service";

@Controller("approvals")
export class ApprovalsController {
  constructor(
    @Inject(ApprovalsService)
    private readonly approvalsService: ApprovalsService,
    @Inject(ActionLogsService)
    private readonly actionLogsService: ActionLogsService
  ) {}

  @Get()
  async listApprovals(
    @Query("status") status?: string,
    @Query("riskLevel") riskLevel?: string,
    @Query("actionType") actionType?: string
  ) {
    return {
      success: true,
      data: {
        approvals: await this.approvalsService.listApprovalRequests({
          status: status as never,
          riskLevel: riskLevel as never,
          actionType
        })
      }
    };
  }

  @Post("demo-send-email")
  async createDemoSendEmailApproval() {
    const approval = await this.approvalsService.createApprovalRequest({
      actionType: "demo_send_email",
      summary: "Demo send-email approval",
      description:
        "Safe Phase 3 demo. No real email is sent; this only verifies the approval and action-log flow.",
      payloadPreview: {
        to: "example@example.com",
        subject: "Demo approval flow",
        body: "This preview is never sent."
      },
      riskLevel: "high",
      requestedBy: "Kaif",
      metadata: {
        demo: true,
        realExternalAction: false
      }
    });

    await this.actionLogsService.createActionLog({
      approvalId: approval.id,
      actionType: approval.actionType,
      summary: approval.summary,
      status: "approval_required",
      riskLevel: approval.riskLevel,
      inputPreview: approval.payloadPreview,
      metadata: {
        demo: true,
        realExternalAction: false
      }
    });

    return {
      success: true,
      data: approval
    };
  }

  @Get(":id")
  async getApproval(@Param("id") id: string) {
    return {
      success: true,
      data: await this.approvalsService.getApprovalRequest(id)
    };
  }

  @Post()
  async createApproval(@Body() body: CreateApprovalRequestDto) {
    const approval = await this.approvalsService.createApprovalRequest(body);

    await this.actionLogsService.createActionLog({
      approvalId: approval.id,
      actionType: approval.actionType,
      summary: approval.summary,
      status: "approval_required",
      riskLevel: approval.riskLevel,
      inputPreview: approval.payloadPreview,
      metadata: {
        createdFromApi: true
      }
    });

    return {
      success: true,
      data: approval
    };
  }

  @Post(":id/approve")
  async approveApproval(
    @Param("id") id: string,
    @Body() body: ApprovalDecisionDto
  ) {
    const approval = await this.approvalsService.approveRequest(
      id,
      body.metadata
    );
    await this.actionLogsService.markApprovalLogs(id, "approved");

    return {
      success: true,
      data: approval
    };
  }

  @Post(":id/reject")
  async rejectApproval(
    @Param("id") id: string,
    @Body() body: ApprovalDecisionDto
  ) {
    const approval = await this.approvalsService.rejectRequest(
      id,
      body.reason,
      body.metadata
    );
    await this.actionLogsService.markApprovalLogs(id, "rejected");

    return {
      success: true,
      data: approval
    };
  }
}
