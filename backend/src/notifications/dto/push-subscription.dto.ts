import { IsObject, IsString } from 'class-validator';

export class PushSubscriptionKeysDto {
    @IsString()
    p256dh: string;

    @IsString()
    auth: string;
}

export class SavePushSubscriptionDto {
    @IsString()
    endpoint: string;

    @IsObject()
    keys: PushSubscriptionKeysDto;
}
