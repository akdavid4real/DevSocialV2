import { IsString, IsArray, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ExperienceLevel, Gender } from '../../../generated/prisma';

export class UpdateOnboardingDto {
    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @IsOptional()
    @IsString()
    @MaxLength(250)
    bio?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    @IsString()
    techCareerPath?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    techStack?: string[];

    @IsOptional()
    @IsEnum(ExperienceLevel)
    experienceLevel?: ExperienceLevel;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    interests?: string[];

    @IsOptional()
    @IsString()
    affiliation?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    badges?: string[];
}
