import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString
} from "class-validator";

import { memorySensitivities, memoryStatuses, memoryTypes } from "../memory.types";

export class UpdateMemoryDto {
  @IsIn(memoryTypes)
  @IsOptional()
  type?: (typeof memoryTypes)[number];

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  source?: string;

  @IsIn(memorySensitivities)
  @IsOptional()
  sensitivity?: (typeof memorySensitivities)[number];

  @IsIn(memoryStatuses)
  @IsOptional()
  status?: (typeof memoryStatuses)[number];

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
