import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const COMMUNITY_CATEGORIES = [
    'FRONTEND',
    'BACKEND',
    'MOBILE',
    'DEVOPS',
    'DATA',
    'AI',
    'BLOCKCHAIN',
    'GENERAL',
] as const;

export class CreateCommunityDto {
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    name: string;

    @IsString()
    @MinLength(10)
    @MaxLength(500)
    description: string;

    @IsString()
    @IsIn(COMMUNITY_CATEGORIES)
    category: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    rules?: string[];

    @IsBoolean()
    @IsOptional()
    isPrivate?: boolean;
}
