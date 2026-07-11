import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength
} from "class-validator";

import {
  ResearchMode,
  ResearchStatus,
  researchModes,
  researchStatuses
} from "../research.types";

export class CreateResearchDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  query!: string;

  @IsIn(researchModes)
  mode!: ResearchMode;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({ require_protocol: true }, { each: true })
  urls?: string[];
}

export class ListResearchDto {
  @IsOptional()
  @IsIn(researchModes)
  mode?: ResearchMode;

  @IsOptional()
  @IsIn(researchStatuses)
  status?: ResearchStatus;

  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(4000)
  query?: string;
}
