import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class PostContentAssistDto {
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  content: string;
}

export class EnhanceTextDto {
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  content: string;

  @IsString()
  @IsIn(['professional', 'casual', 'funny', 'hashtags'])
  action: 'professional' | 'casual' | 'funny' | 'hashtags';
}
