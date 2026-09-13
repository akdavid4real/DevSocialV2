import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export const FEEDBACK_TYPES = ['BUG', 'FEATURE', 'GENERAL', 'IMPROVEMENT'] as const;

export class CreateFeedbackDto {
    @IsString()
    @IsIn(FEEDBACK_TYPES)
    type: string;

    @IsString()
    @MinLength(3)
    @MaxLength(200)
    subject: string;

    @IsString()
    @MinLength(10)
    description: string;

    @IsInt()
    @Min(1)
    @Max(5)
    @IsOptional()
    rating?: number;
}
