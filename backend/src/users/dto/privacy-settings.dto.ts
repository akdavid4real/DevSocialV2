import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, ValidateNested } from 'class-validator';

export enum ProfileVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum WhoCanMessage {
  EVERYONE = 'EVERYONE',
  FOLLOWERS = 'FOLLOWERS',
  NOBODY = 'NOBODY',
}

export class PrivacySettingsDto {
  @IsEnum(ProfileVisibility)
  profileVisibility: ProfileVisibility;

  @IsEnum(WhoCanMessage)
  whoCanMessage: WhoCanMessage;

  @IsBoolean()
  showEmail: boolean;

  @IsBoolean()
  showBirthday: boolean;

  @IsBoolean()
  allowMentions: boolean;

  @IsBoolean()
  showActivityStatus: boolean;

  @IsBoolean()
  allowSearchEngineIndexing: boolean;
}

export class UpdatePrivacySettingsDto {
  @ValidateNested()
  @Type(() => PrivacySettingsDto)
  privacySettings: PrivacySettingsDto;
}
