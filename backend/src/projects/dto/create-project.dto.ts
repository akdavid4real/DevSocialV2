import { IsArray, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

const PROJECT_STATUSES = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'] as const;
const VISIBILITIES = ['PUBLIC', 'PRIVATE'] as const;

export class CreateProjectDto {
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    title: string;

    @IsString()
    @MinLength(20)
    description: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    technologies?: string[];

    @IsUrl()
    @IsOptional()
    githubUrl?: string;

    @IsUrl()
    @IsOptional()
    liveUrl?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    images?: string[];

    @IsOptional()
    openPositions?: any;

    @IsString()
    @IsIn(PROJECT_STATUSES)
    @IsOptional()
    status?: string;

    @IsString()
    @IsIn(VISIBILITIES)
    @IsOptional()
    visibility?: string;
}
