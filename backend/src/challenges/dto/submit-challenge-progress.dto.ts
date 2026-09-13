import { IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class SubmitChallengeProgressDto {
    @IsInt()
    @Min(0)
    @Max(100)
    progress: number;

    @IsObject()
    @IsOptional()
    submissionData?: Record<string, unknown>;
}
