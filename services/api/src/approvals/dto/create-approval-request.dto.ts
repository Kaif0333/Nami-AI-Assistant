import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

import { riskLevels } from "../../safety/safe-action-policy.types";

export class CreateApprovalRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  actionType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  description?: string;

  @IsOptional()
  @IsObject()
  payloadPreview?: Record<string, unknown>;

  @IsOptional()
  @IsIn(riskLevels)
  riskLevel?: (typeof riskLevels)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  requestedBy?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
