import { IsBoolean, IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const CHALLENGE_TYPES = ['POST_CREATION', 'ENGAGEMENT', 'COMMUNITY', 'LEARNING', 'CREATIVE'] as const;
export const CHALLENGE_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

export class CreateChallengeDto {
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    title: string;

    @IsString()
    @MinLength(10)
    @MaxLength(500)
    description: string;

    @IsString()
    @IsIn(CHALLENGE_TYPES)
    type: string;

    @IsString()
    @IsIn(CHALLENGE_DIFFICULTIES)
    difficulty: string;

    @IsObject()
    requirements: {
        target?: number;
        metric?: string;
        description?: string;
    };

    @IsObject()
    rewards: {
        xp?: number;
        badge?: string;
        title?: string;
    };

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    @IsInt()
    @Min(0)
    @Max(500)
    @IsOptional()
    firstCompletionBonus?: number;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
