import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class ApprovalDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
