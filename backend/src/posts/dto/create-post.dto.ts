import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreatePostDto {
    @IsString()
    @IsOptional()
    content: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    imageUrls?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    videoUrls?: string[];

    @IsBoolean()
    @IsOptional()
    isAnonymous?: boolean;

    @IsOptional()
    poll?: any;

    @IsString()
    @IsOptional()
    communityId?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    mentions?: string[];
}
