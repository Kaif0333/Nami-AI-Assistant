import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class TranscribeVoiceDto {
  @IsString()
  @MaxLength(16_000_000)
  audioBase64!: string;

  @IsString()
  @MaxLength(80)
  mimeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  fileName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5 * 60 * 1000)
  durationMs?: number;
}
