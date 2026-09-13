import { IsString, MaxLength } from 'class-validator';

export class MessageReactionDto {
  @IsString()
  @MaxLength(16)
  emoji: string;
}
