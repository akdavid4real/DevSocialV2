import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateMissionProgressDto {
    @IsString()
    stepId: string;

    @IsInt()
    @Min(0)
    @Max(100000)
    @IsOptional()
    current?: number;

    @IsBoolean()
    @IsOptional()
    completed?: boolean;
}
