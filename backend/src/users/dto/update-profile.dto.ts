import { IsString, IsOptional, IsArray, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MaxLength(50)
    displayName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(250)
    bio?: string;

    @IsOptional()
    @IsString()
    @IsUrl()
    avatar?: string;

    @IsOptional()
    @IsString()
    @IsUrl()
    bannerUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    location?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    website?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    githubUsername?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    linkedinUrl?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    affiliation?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    techStack?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    interests?: string[];
}
