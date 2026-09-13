import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const REPORT_REASONS = ['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'MISINFORMATION', 'COPYRIGHT', 'OTHER'] as const;

export class CreateReportDto {
    @IsUUID()
    postId: string;

    @IsString()
    @IsIn(REPORT_REASONS)
    reason: string;

    @IsString()
    @MaxLength(500)
    @IsOptional()
    description?: string;
}
