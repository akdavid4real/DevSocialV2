import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const MISSION_TYPES = ['SOCIAL', 'CONTENT', 'ENGAGEMENT', 'LEARNING', 'ACHIEVEMENT'] as const;
export const MISSION_DURATIONS = ['DAILY', 'WEEKLY', 'MONTHLY', 'PERMANENT'] as const;
export const MISSION_DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

export class CreateMissionDto {
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    title: string;

    @IsString()
    @MinLength(10)
    @MaxLength(500)
    description: string;

    @IsString()
    @IsIn(MISSION_TYPES)
    type: string;

    @IsString()
    @IsIn(MISSION_DIFFICULTIES)
    difficulty: string;

    @IsString()
    @IsIn(MISSION_DURATIONS)
    duration: string;

    @IsArray()
    steps: Array<{
        id?: string;
        title?: string;
        description?: string;
        metric?: string;
        target?: number;
    }>;

    @IsObject()
    rewards: {
        xp?: number;
        badge?: string;
        title?: string;
        specialReward?: string;
    };

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    prerequisites?: string[];

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
