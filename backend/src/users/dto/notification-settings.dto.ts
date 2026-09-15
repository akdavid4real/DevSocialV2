import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, ValidateNested } from 'class-validator';

export enum EmailDigestFrequency {
  INSTANT = 'INSTANT',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  NEVER = 'NEVER',
}

export class NotificationSettingsDto {
  @IsBoolean()
  emailOnNewFollower: boolean;

  @IsBoolean()
  emailOnMention: boolean;

  @IsBoolean()
  emailOnLike: boolean;

  @IsBoolean()
  emailOnComment: boolean;

  @IsBoolean()
  emailOnMessage: boolean;

  @IsEnum(EmailDigestFrequency)
  emailDigestFrequency: EmailDigestFrequency;

  @IsBoolean()
  pushOnNewFollower: boolean;

  @IsBoolean()
  pushOnMention: boolean;

  @IsBoolean()
  pushOnLike: boolean;

  @IsBoolean()
  pushOnComment: boolean;

  @IsBoolean()
  pushOnMessage: boolean;

  @IsBoolean()
  weeklyDigest: boolean;
}

export class UpdateNotificationSettingsDto {
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings: NotificationSettingsDto;
}
