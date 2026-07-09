import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SynthesizeVoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  voice?: string;
}
