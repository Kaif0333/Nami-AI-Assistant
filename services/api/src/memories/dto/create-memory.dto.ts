import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString
} from "class-validator";

import { memorySensitivities, memoryTypes } from "../memory.types";

export class CreateMemoryDto {
  @IsIn(memoryTypes)
  type!: (typeof memoryTypes)[number];

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

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

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
