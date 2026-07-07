import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength
} from "class-validator";

import { actionLogStatuses } from "../action-log.types";
import { riskLevels } from "../../safety/safe-action-policy.types";

export class CreateActionLogDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  commandId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  approvalId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  actionType!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  summary!: string;

  @IsOptional()
  @IsIn(actionLogStatuses)
  status?: (typeof actionLogStatuses)[number];

  @IsOptional()
  @IsIn(riskLevels)
  riskLevel?: (typeof riskLevels)[number];

  @IsOptional()
  @IsObject()
  inputPreview?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  outputPreview?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  errorMessage?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
