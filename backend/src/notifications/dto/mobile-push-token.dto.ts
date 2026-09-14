import { IsString, Matches } from 'class-validator';

export class MobilePushTokenDto {
  @IsString()
  @Matches(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/, {
    message: 'Invalid Expo push token',
  })
  token: string;
}
