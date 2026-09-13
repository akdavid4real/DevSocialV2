import { IsString } from 'class-validator';

export class SaveReadyPlayerAvatarDto {
    @IsString()
    avatarUrl: string;
}
