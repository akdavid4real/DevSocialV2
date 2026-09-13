import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsNotEmpty()
  @IsUUID()
  receiverId: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
